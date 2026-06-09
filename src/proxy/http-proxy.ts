import type { Socket } from "node:net";
import { createConnection } from "node:net";
import type {
  ParsedHttpRequest,
  ParsedHttpResponse,
  ParseResponseNeedClose,
} from "../types.js";
import { parseHttpResponse } from "./http-parser.js";

interface CreateHttpProxyOptions {
  request: ParsedHttpRequest;
  clientSocket: Socket;
}

/**
 * Phase 2：HTTP 正向代理（带响应日志 + 完整 body 分帧支持）。
 *
 * 处理 3 种 body 分帧方式：
 *   - Content-Length          → 在读够字节后立即完成
 *   - Transfer-Encoding chunked → 逐段解码后完成
 *   - 两者都没有              → 等 socket 关闭时把剩余字节当 body
 */
export function createHttpProxy({
  request,
  clientSocket,
}: CreateHttpProxyOptions): void {
  const { url, method, httpVersion, headers, body } = request;
  const port = url.port ? Number.parseInt(url.port, 10) : 80;

  // ----- 1. 构造转发请求（绝对 URL → 相对路径）-----
  const path = url.pathname + url.search;
  let forwardRaw = `${method} ${path} ${httpVersion}\r\n`;
  for (const [key, value] of Object.entries(headers)) {
    forwardRaw += `${key}: ${value}\r\n`;
  }
  forwardRaw += `\r\n`;
  if (body) {
    forwardRaw += body;
  }

  // ----- 2. 连接目标服务器 -----
  const targetSocket = createConnection({ host: url.hostname, port });

  targetSocket.on("error", (err) => {
    console.error(
      `[proxy] target error (${url.hostname}:${port}):`,
      err.message,
    );
    if (!clientSocket.destroyed) {
      clientSocket.end();
    }
  });

  targetSocket.on("connect", () => {
    console.log(`[proxy] → target ${method} ${path} ${httpVersion}`);
    targetSocket.write(forwardRaw);

    clientSocket.pipe(targetSocket);
  });

  // ----- 3. 收响应 -----
  let responseBuffer = Buffer.alloc(0);
  let needClose: ParseResponseNeedClose | null = null;
  let resolved = false;

  function handleResponse(response: ParsedHttpResponse) {
    if (resolved) return;
    resolved = true;

    const contentType = response.headers["content-type"] ?? "";

    console.log(
      `[proxy] ← target ${response.statusCode} ${response.statusText} (${response.body.length}B) ${contentType}`,
    );

    clientSocket.write(response.raw);
    console.log(
      `[proxy] → client ${response.statusCode} ${response.statusText}`,
    );

    clientSocket.end();
    targetSocket.end();
  }

  targetSocket.on("data", (chunk: Buffer) => {
    if (resolved) return;
    responseBuffer = Buffer.concat([responseBuffer, chunk]);

    const result = parseHttpResponse(responseBuffer);
    if (!result) return;

    if (result.type === "need-close") {
      needClose = result;
      return;
    }

    // Content-Length 或 chunked 已收全
    responseBuffer = responseBuffer.subarray(result.bytesConsumed);
    handleResponse(result.response);
  });

  // 无帧头响应：等目标服务器关连接，此时 buffer 里的剩余字节就是完整 body
  targetSocket.on("close", () => {
    if (!resolved && needClose) {
      const body = responseBuffer.subarray(needClose.headEnd + 4).toString();
      const raw = needClose.headRaw + body;
      handleResponse({
        statusCode: needClose.statusCode,
        statusText: needClose.statusText,
        httpVersion: needClose.httpVersion,
        headers: needClose.headers,
        body,
        raw,
      });
      return;
    }

    if (!clientSocket.destroyed) {
      clientSocket.end();
    }
  });
}
