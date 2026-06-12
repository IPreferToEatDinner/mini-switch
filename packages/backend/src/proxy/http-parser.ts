import type { ParseHttpResponseResult, ParseResult } from "../types.js";

/**
 * 从字节缓冲区中解析一条完整的 HTTP/1.x 请求。
 *
 * TCP 是字节流，不是消息流 —— 一次 data 事件收到的数据可能只是
 * 请求的一部分（也可能包含多个请求）。当数据不够时，函数返回 null，
 * 调用方应继续缓冲更多字节后再试。
 *
 * 当收集到完整请求后（头部 + Content-Length 指定的 body），
 * 函数返回 ParseResult，告诉调用方"消耗了多少字节"。
 */
export function parseHttpRequest(buffer: Buffer): ParseResult | null {
  // ----- 1. 找头部边界 -----
  const headEnd = buffer.indexOf("\r\n\r\n");
  if (headEnd === -1) {
    // 头部还没收完，继续等
    return null;
  }

  const headStr = buffer.subarray(0, headEnd).toString();
  const lines = headStr.split("\r\n");

  // ----- 2. 解析请求行 -----
  const requestLine = lines[0];
  if (!requestLine) return null;

  const [method, rawUrl, ...rest] = requestLine.split(" ");
  // 万一 URL 里含空格（异常情况），重新拼回
  const httpVersion = rest.join(" ");

  if (!method || !rawUrl || !httpVersion) return null;

  // ----- 3. 解析头部字段 -----
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    headers[key] = value;
  }

  // ----- 4. 处理 CONNECT（host:port 格式，没有 body）-----
  if (method.toUpperCase() === "CONNECT") {
    const url = safeUrl(rawUrl, method);
    if (!url) return null;

    return {
      request: {
        method: "CONNECT",
        url,
        httpVersion: httpVersion.toUpperCase(),
        headers,
        body: "",
        raw: buffer.subarray(0, headEnd + 4).toString(),
      },
      bytesConsumed: headEnd + 4,
    };
  }

  // ----- 5. 普通 HTTP 请求 —— 解析绝对 URL -----
  const url = safeUrl(rawUrl, method);
  if (!url) return null;

  // ----- 6. 按 Content-Length 精确读取 body -----
  const contentLength = parseContentLength(headers["content-length"] ?? "0");

  // 总共需要的字节数 = 头部 + \r\n\r\n + body
  const totalLength = headEnd + 4 + contentLength;

  if (buffer.length < totalLength) {
    // body 还没收全，继续等
    return null;
  }

  const body = buffer.subarray(headEnd + 4, totalLength).toString();
  const raw = buffer.subarray(0, totalLength).toString();

  return {
    request: {
      method: method.toUpperCase(),
      url,
      httpVersion: httpVersion.toUpperCase(),
      headers,
      body,
      raw,
    },
    bytesConsumed: totalLength,
  };
}

/**
 * 从字节缓冲区中解析一条完整的 HTTP/1.x 响应。
 *
 * 处理 3 种 body 分帧方式：
 *
 *   有 Content-Length → 读完 N 字节 body 后返回 complete
 *   有 Transfer-Encoding: chunked → 逐段解码后返回 complete
 *   两者都没有 → 返回 need-close，调用方等 socket 关闭后再取 body
 *
 * 数据不够时返回 null，调用方应继续缓冲更多字节后再试。
 */
export function parseHttpResponse(buffer: Buffer): ParseHttpResponseResult {
  const headEnd = buffer.indexOf("\r\n\r\n");
  if (headEnd === -1) return null;

  const headStr = buffer.subarray(0, headEnd).toString();
  const lines = headStr.split("\r\n");

  const statusLine = lines[0];
  if (!statusLine) return null;

  const parts = statusLine.split(" ");
  const httpVersion = parts[0];
  const statusCode = Number.parseInt(parts[1] ?? "0", 10);
  const statusText = parts.slice(2).join(" ");

  if (!httpVersion || !statusCode) return null;

  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    headers[key] = value;
  }

  // ----- 分支 1：Transfer-Encoding: chunked -----
  const te = (headers["transfer-encoding"] ?? "").toLowerCase();
  if (te.includes("chunked")) {
    const decoded = decodeChunkedBody(buffer, headEnd + 4);
    if (!decoded) return null;

    const bodyLength = headEnd + 4 + decoded.bytesConsumed;
    const raw = buffer.subarray(0, bodyLength).toString();

    return {
      type: "complete",
      response: {
        statusCode,
        statusText,
        httpVersion,
        headers,
        body: decoded.body,
        raw,
      },
      bytesConsumed: bodyLength,
    };
  }

  // ----- 分支 2：Content-Length -----
  const contentLength = parseContentLength(headers["content-length"] ?? "0");
  if (contentLength > 0 || "content-length" in headers) {
    const totalLength = headEnd + 4 + contentLength;
    if (buffer.length < totalLength) return null;

    const body = buffer.subarray(headEnd + 4, totalLength).toString();
    const raw = buffer.subarray(0, totalLength).toString();

    return {
      type: "complete",
      response: { statusCode, statusText, httpVersion, headers, body, raw },
      bytesConsumed: totalLength,
    };
  }

  // ----- 分支 3：既没有 Content-Length 也没有 chunked -----
  // body 长度未知，等 socket 关闭才能确定（HTTP/1.0 兼容 / Connection: close）
  return {
    type: "need-close",
    statusCode,
    statusText,
    httpVersion,
    headers,
    headRaw: buffer.subarray(0, headEnd + 4).toString(),
    headEnd,
  };
}

// ---- 内部工具函数 ----

/**
 * 解码 chunked transfer encoding 的 body。
 *
 * chunked 格式：
 *   1a\r\n                          ← 十六进制长度（26 字节）
 *   <!DOCTYPE html><html>\r\n       ← chunk 数据
 *   d\r\n                           ← 下一个 chunk（13 字节）
 *   <head></head>\r\n
 *   0\r\n                           ← 长度为 0，结束
 *   \r\n                            ← 最后的空行
 *
 * @returns 解码后的 body 和消耗的字节数；数据不完整时返回 null
 */
function decodeChunkedBody(
  buffer: Buffer,
  start: number,
): { body: string; bytesConsumed: number } | null {
  let pos = start;
  let body = "";

  while (true) {
    const sizeEnd = buffer.indexOf("\r\n", pos);
    if (sizeEnd === -1) return null;

    const sizeHex = buffer.subarray(pos, sizeEnd).toString();
    // 忽略 chunk extension（例如 ";foo=bar"）
    const chunkSize = Number.parseInt(sizeHex.split(";")[0], 16);
    if (!Number.isFinite(chunkSize) || chunkSize < 0) return null;

    pos = sizeEnd + 2;

    if (chunkSize === 0) {
      // 最后一个 chunk：期望尾部的 \r\n
      if (buffer.length < pos + 2) return null;
      pos += 2;
      return { body, bytesConsumed: pos - start };
    }

    // 读取 chunk 数据 + 尾部的 \r\n
    const chunkEnd = pos + chunkSize + 2;
    if (buffer.length < chunkEnd) return null;

    body += buffer.subarray(pos, pos + chunkSize).toString();
    pos = chunkEnd;
  }
}

function parseContentLength(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function safeUrl(rawUrl: string, method: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    if (method.toUpperCase() === "CONNECT") {
      try {
        return new URL(`https://${rawUrl}`);
      } catch {
        return null;
      }
    }
    return null;
  }
}
