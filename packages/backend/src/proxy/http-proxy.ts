import type { Socket } from "node:net";
import { createConnection } from "node:net";
import type {
  ParsedHttpRequest,
  ParsedHttpResponse,
  ParseResponseNeedClose,
  RuleAction,
} from "../types.js";
import { logger } from "../logger.js";
import { updateSession } from "../store/db.js";
import { compileActionPlan } from "./action-pipeline.js";
import { parseHttpResponse } from "./http-parser.js";

interface CreateHttpProxyOptions {
  request: ParsedHttpRequest;
  clientSocket: Socket;
  actions: RuleAction[] | null;
  sessionId: number;
}

/**
 * Phase 2：HTTP 正向代理（执行 ActionPlan）。
 *
 * 职责单一的调度器：
 *   1. mock 短路
 *   2. 请求变换（reqHeaders, reqBody, redirect）
 *   3. requestDelay → TCP 连接 → 转发 → 收响应
 *   4. 响应变换（modifyBody, resHeaders）→ responseDelay → 返回
 */
export function createHttpProxy({
  request,
  clientSocket,
  actions,
  sessionId,
}: CreateHttpProxyOptions): void {
  const startTime = Date.now();

  const log = (level: "info" | "warn" | "error", message: string) => {
    logger[level]({ category: "proxy", message, sessionId });
  };

  // ----- 0. 编译管线 -----
  const plan = compileActionPlan(actions ?? []);

  // mock: 直接返回，不连目标
  if (plan.mock) {
    log(
      "info",
      `← mock ${plan.mock.statusCode} ${plan.mock.statusText} (${plan.mock.body.length}B)`,
    );
    clientSocket.write(plan.mock.raw);
    log(
      "info",
      `→ client ${plan.mock.statusCode} ${plan.mock.statusText}`,
    );
    clientSocket.end();
    updateSession(sessionId, {
      statusCode: plan.mock.statusCode,
      statusText: plan.mock.statusText,
      contentType: plan.mock.headers["content-type"],
      responseSize: plan.mock.body.length,
      responseHeaders: plan.mock.headers,
      responseBody: plan.mock.body,
      durationMs: Date.now() - startTime,
    });
    return;
  }

  // ----- 1. 应用请求变换 -----
  const transformed = plan.transformRequest(request);

  // redirect: 重写目标 URL
  let targetUrl = transformed.url;
  if (plan.redirectUrl) {
    try {
      targetUrl = new URL(plan.redirectUrl);
      log(
        "info",
        `redirect: ${transformed.url.href} → ${targetUrl.href}`,
      );
    } catch {
      log(
        "error",
        `invalid redirect URL: ${plan.redirectUrl}`,
      );
      clientSocket.write(
        "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n",
      );
      clientSocket.end();
      updateSession(sessionId, {
        statusCode: 500,
        statusText: "Internal Server Error",
        error: `Invalid redirect URL: ${plan.redirectUrl}`,
        durationMs: Date.now() - startTime,
      });
      return;
    }
  }

  const port = targetUrl.port
    ? Number.parseInt(targetUrl.port, 10)
    : targetUrl.protocol === "https:"
      ? 443
      : 80;

  const path = targetUrl.pathname + targetUrl.search;
  const method = transformed.method;
  const httpVersion = transformed.httpVersion;

  // 构造转发用的原始字节（使用已变换的 headers + body）
  let forwardRaw = `${method} ${path} ${httpVersion}\r\n`;
  for (const [key, value] of Object.entries(transformed.headers)) {
    forwardRaw += `${key}: ${value}\r\n`;
  }
  forwardRaw += `\r\n`;
  if (transformed.body) forwardRaw += transformed.body;

  // ----- 2. 连接目标（可能有 request delay）-----
  const connectToTarget = () => {
    const targetSocket = createConnection({
      host: targetUrl.hostname,
      port,
    });

    targetSocket.on("error", (err) => {
      log(
        "error",
        `target error (${targetUrl.hostname}:${port}): ${err.message}`,
      );
      updateSession(sessionId, {
        error: `Target error: ${err.message}`,
        durationMs: Date.now() - startTime,
      });
      if (!clientSocket.destroyed) clientSocket.end();
    });

    targetSocket.on("connect", () => {
      log("info", `→ target ${method} ${path} ${httpVersion}`);
      targetSocket.write(forwardRaw);
      clientSocket.pipe(targetSocket);
    });

    // ----- 3. 收响应 → 变换 → delay → 返回 -----
    let responseBuffer = Buffer.alloc(0);
    let needClose: ParseResponseNeedClose | null = null;
    let resolved = false;

    function sendToClient(response: ParsedHttpResponse) {
      if (resolved) return;
      resolved = true;

      const transformed = plan.transformResponse(response);

      const contentType = transformed.headers["content-type"] ?? "";
      log(
        "info",
        `← target ${transformed.statusCode} ${transformed.statusText} (${transformed.body.length}B) ${contentType}`,
      );

      updateSession(sessionId, {
        statusCode: transformed.statusCode,
        statusText: transformed.statusText,
        contentType,
        responseSize: transformed.body.length,
        responseHeaders: transformed.headers,
        responseBody: transformed.body,
        durationMs: Date.now() - startTime,
      });

      const doSend = () => {
        clientSocket.write(transformed.raw);
        log(
          "info",
          `→ client ${transformed.statusCode} ${transformed.statusText}`,
        );
        clientSocket.end();
        targetSocket.end();
      };

      if (plan.responseDelay && plan.responseDelay > 0) {
        log(
          "info",
          `delaying response by ${plan.responseDelay}ms`,
        );
        setTimeout(doSend, plan.responseDelay);
      } else {
        doSend();
      }
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

      responseBuffer = responseBuffer.subarray(result.bytesConsumed);
      sendToClient(result.response);
    });

    targetSocket.on("close", () => {
      if (!resolved && needClose) {
        const body = responseBuffer.subarray(needClose.headEnd + 4).toString();
        const raw = needClose.headRaw + body;
        sendToClient({
          statusCode: needClose.statusCode,
          statusText: needClose.statusText,
          httpVersion: needClose.httpVersion,
          headers: needClose.headers,
          body,
          raw,
        });
        return;
      }

      if (!clientSocket.destroyed) clientSocket.end();
    });
  };

  if (plan.requestDelay && plan.requestDelay > 0) {
    log("info", `delaying request by ${plan.requestDelay}ms`);
    setTimeout(connectToTarget, plan.requestDelay);
  } else {
    connectToTarget();
  }
}
