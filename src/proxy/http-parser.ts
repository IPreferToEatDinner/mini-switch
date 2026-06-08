import type { ParseResult } from "../types.js";

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

// ---- 内部工具函数 ----

/**
 * 安全解析 Content-Length 头。
 * 非法值 / 缺失时返回 0（无 body）。
 */
function parseContentLength(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * 把请求行中的 URL 解析为 URL 对象。
 *
 * 正向代理的请求行始终包含绝对 URL：
 *   GET http://host/path HTTP/1.1
 *   CONNECT host:443 HTTP/1.1   ← 特殊：host:port，无 scheme
 */
function safeUrl(rawUrl: string, method: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    // CONNECT 的 URL 是 host:port 格式，没 scheme
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
