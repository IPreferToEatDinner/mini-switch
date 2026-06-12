import { createServer } from "node:net";
import { parseHttpRequest } from "./proxy/http-parser.js";
import { createHttpProxy } from "./proxy/http-proxy.js";
import { loadRules, matchActions } from "./proxy/rule-engine.js";
import { startApiServer } from "./server/api.js";
import {
  insertLog,
  insertSession,
  vacuum
} from "./store/db.js";
import type { ProxyConfig, ProxyRule } from "./types.js";

const DEFAULT_PROXY_PORT = 6677;
const MAX_RECORDS = 10000;

function getConfig(): ProxyConfig {
  return {
    port: DEFAULT_PROXY_PORT,
    host: "127.0.0.1",
  };
}

function startServer(config: ProxyConfig, rules: ProxyRule[]): void {
  const server = createServer((clientSocket) => {
    // 每个连接有自己的缓冲区，用来从 TCP 字节流中拼出完整请求
    let buffer = Buffer.alloc(0);

    // 一旦把 socket 交给代理（pipe 建立后），就不再监听 data 事件，
    // 后续数据流由 pipe 处理
    let proxied = false;

    clientSocket.on("error", (err) => {
      console.error("[proxy] client socket error:", err.message);
      insertLog({
        level: "error",
        category: "proxy",
        message: `Client socket error: ${err.message}`,
      });
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
        const msg = "[proxy] CONNECT rejected (HTTPS not implemented yet)";
        console.log(msg);
        insertLog({ level: "warn", category: "proxy", message: msg });
        clientSocket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
        clientSocket.end();
        return;
      }

      console.log(`[proxy] ← client ${request.method} ${request.url.href}`);

      proxied = true;
      const actions = matchActions(request, rules);
      const matchedRuleNames = actions?.map((a) => a.type) ?? [];

      const sessionId = insertSession({
        method: request.method,
        url: request.url.href,
        host: request.url.hostname,
        path: request.url.pathname + request.url.search,
        requestHeaders: request.headers,
        requestBody: request.body || undefined,
        matchedRules: matchedRuleNames.length > 0
          ? matchedRuleNames
          : undefined,
      });

      insertLog({
        level: "info",
        category: "proxy",
        message: `← client ${request.method} ${request.url.href}`,
        sessionId,
      });

      createHttpProxy({ request, clientSocket, actions, sessionId });
    });

    clientSocket.on("end", () => {
      console.log("[proxy] client disconnected");
    });
  });

  server.listen(config.port, config.host, () => {
    const msg = `
  mini-switch v1.0.0
  ────────────────────────────────────
  Proxy:      http://${config.host}:${config.port}
  Dashboard:  http://${config.host}:6678
  `;
    console.log(msg);
    insertLog({
      level: "info",
      category: "proxy",
      message: `Proxy server started on ${config.host}:${config.port}`,
    });
  });

  server.on("error", (err) => {
    console.error("[proxy] server error:", err.message);
    insertLog({
      level: "error",
      category: "proxy",
      message: `Server error: ${err.message}`,
    });
    process.exit(1);
  });
}

const config = getConfig();
const rules = loadRules();
startServer(config, rules);
startApiServer();

// 定期清理旧记录
setInterval(() => vacuum(MAX_RECORDS), 5 * 60 * 1000);
