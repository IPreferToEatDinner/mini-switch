import { createServer } from "node:net";
import { parseHttpRequest } from "./proxy/http-parser.js";
import { createHttpProxy } from "./proxy/http-proxy.js";
import type { ProxyConfig } from "./types.js";

const DEFAULT_PROXY_PORT = 6677;

function getConfig(): ProxyConfig {
  return {
    port: DEFAULT_PROXY_PORT,
    host: "127.0.0.1",
  };
}

function startServer(config: ProxyConfig): void {
  const server = createServer((clientSocket) => {
    // 每个连接有自己的缓冲区，用来从 TCP 字节流中拼出完整请求
    let buffer = Buffer.alloc(0);

    // 一旦把 socket 交给代理（pipe 建立后），就不再监听 data 事件，
    // 后续数据流由 pipe 处理
    let proxied = false;

    clientSocket.on("error", (err) => {
      console.error("[proxy] client socket error:", err.message);
    });

    clientSocket.on("data", (chunk: Buffer) => {
      if (proxied) return;

      // 把新收到的字节追加到缓冲区
      buffer = Buffer.concat([buffer, chunk]);

      // 尝试从缓冲区中拆出完整请求
      const result = parseHttpRequest(buffer);
      if (!result) {
        // 数据还不够拼出一条完整请求，继续等
        return;
      }

      // 从缓冲区中移除已消费的字节
      const { request, bytesConsumed } = result;
      buffer = buffer.subarray(bytesConsumed);

      if (request.method === "CONNECT") {
        // CONNECT 隧道是 Phase 3 的内容，目前先拒绝
        console.log("[proxy] CONNECT rejected (HTTPS not implemented yet)");
        clientSocket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
        clientSocket.end();
        return;
      }

      console.log(`[proxy] ← client ${request.method} ${request.url.href}`);

      proxied = true;
      createHttpProxy({ request, clientSocket });
    });

    clientSocket.on("end", () => {
      console.log("[proxy] client disconnected");
    });
  });

  server.listen(config.port, config.host, () => {
    console.log(`
  mini-switch v1.0.0
  ────────────────────────────────────
  Proxy:      http://${config.host}:${config.port}
  `);
  });

  server.on("error", (err) => {
    console.error("[proxy] server error:", err.message);
    process.exit(1);
  });
}

const config = getConfig();
startServer(config);
