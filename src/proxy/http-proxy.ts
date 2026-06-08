import type { Socket } from "node:net";
import { createConnection } from "node:net";
import type { ParsedHttpRequest } from "../types.js";

interface CreateHttpProxyOptions {
  request: ParsedHttpRequest;
  clientSocket: Socket;
}

/**
 * Phase 1：HTTP 正向代理。
 *
 *   [客户端]  ----TCP----  [mini-switch]  ----TCP----  [目标服务器]
 *
 * 与目标服务器建立 TCP 连接，然后将客户端 ↔ 目标的数据双向转发。
 */
export function createHttpProxy({
  request,
  clientSocket,
}: CreateHttpProxyOptions): void {
  const { url, raw } = request;
  const port = url.port ? Number.parseInt(url.port, 10) : 80;

  const targetSocket = createConnection({
    host: url.hostname,
    port,
  });

  targetSocket.on("error", (err) => {
    console.error(
      `[proxy] target connection error (${url.hostname}:${port}):`,
      err.message,
    );
    if (!clientSocket.destroyed) {
      clientSocket.end();
    }
  });

  targetSocket.on("connect", () => {
    // 把原始请求字节原封不动发给目标服务器
    targetSocket.write(raw);

    // 双向 pipe：目标 ↔ 客户端
    // Node.js 的 Socket.pipe() 会自动处理背压（backpressure）
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });

  targetSocket.on("close", () => {
    if (!clientSocket.destroyed) {
      clientSocket.end();
    }
  });
}
