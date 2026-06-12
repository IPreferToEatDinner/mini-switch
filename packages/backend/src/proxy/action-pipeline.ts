import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ActionPlan,
  DelayAction,
  MockAction,
  ModifyBodyAction,
  ParsedHttpRequest,
  ParsedHttpResponse,
  ReqBodyAction,
  ReqHeadersAction,
  ResHeadersAction,
  RuleAction,
} from "../types.js";
import { insertLog } from "../store/db.js";

/**
 * 动作管线 —— 将 actions 数组编译为 ActionPlan。
 *
 * 职责：纯计算，不做 I/O（网络、文件、setTimeout 都是 http-proxy 的事）。
 *
 * 分两个阶段：
 *   请求阶段：reqHeaders → reqBody → redirect → delay(request) → mock
 *   响应阶段：delay(response) → modifyBody → resHeaders
 */
export function compileActionPlan(actions: RuleAction[]): ActionPlan {
  let requestDelay = 0;
  let responseDelay = 0;
  let mockResponse: ParsedHttpResponse | undefined;
  let redirectUrl: string | undefined;

  const requestTransforms: Array<
    (req: ParsedHttpRequest) => ParsedHttpRequest
  > = [];
  const responseTransforms: Array<
    (resp: ParsedHttpResponse) => ParsedHttpResponse
  > = [];

  for (const action of actions) {
    switch (action.type) {
      case "mock": {
        mockResponse = buildMockResponse(action);
        break;
      }
      case "delay": {
        const delays = resolveDelay(action);
        if (delays.request > requestDelay) requestDelay = delays.request;
        if (delays.response > responseDelay) responseDelay = delays.response;
        break;
      }
      case "modifyBody": {
        responseTransforms.push((resp) => applyModifyBody(resp, action));
        break;
      }
      case "resHeaders": {
        responseTransforms.push((resp) => applyResHeaders(resp, action));
        break;
      }
      case "reqHeaders": {
        requestTransforms.push((req) => applyReqHeaders(req, action));
        break;
      }
      case "reqBody": {
        requestTransforms.push((req) => applyReqBody(req, action));
        break;
      }
      case "redirect": {
        // 最后一条 redirect 生效（覆盖之前的）
        redirectUrl = action.url;
        console.log(`[pipeline] redirect → ${action.url}`);
        insertLog({
          level: "info",
          category: "pipeline",
          message: `redirect → ${action.url}`,
        });
        break;
      }
    }
  }

  const transformRequest = composeRequestTransforms(requestTransforms);
  const transformResponse = composeTransforms(responseTransforms);

  return {
    mock: mockResponse,
    requestDelay,
    responseDelay,
    redirectUrl,
    transformRequest,
    transformResponse,
  };
}

// ============== Mock ==============

function buildMockResponse(action: MockAction): ParsedHttpResponse {
  const statusCode = action.statusCode ?? 200;
  const statusText = STATUS_MAP[statusCode] ?? "OK";

  let body = action.body ?? "";

  if (action.file) {
    const filePath = resolve(process.cwd(), action.file);
    try {
      body = readFileSync(filePath, "utf-8");
    } catch {
      body = `[mini-switch] failed to read mock file: ${action.file}`;
    }
  }

  const headers: Record<string, string> = {
    "content-length": String(Buffer.byteLength(body)),
    "x-mini-switch-mock": "1",
    ...action.headers,
  };

  let raw = `HTTP/1.1 ${statusCode} ${statusText}\r\n`;
  for (const [key, value] of Object.entries(headers)) {
    raw += `${key}: ${value}\r\n`;
  }
  raw += `\r\n${body}`;

  return {
    statusCode,
    statusText,
    httpVersion: "HTTP/1.1",
    headers,
    body,
    raw,
  };
}

// ============== Delay ==============

function resolveDelay(action: DelayAction): {
  request: number;
  response: number;
} {
  const phase = action.phase ?? "both";
  return {
    request: phase === "request" || phase === "both" ? action.ms : 0,
    response: phase === "response" || phase === "both" ? action.ms : 0,
  };
}

// ============== Modify Body ==============

/**
 * 替换响应 body 并重新计算 Content-Length。
 *
 * 对应知识点：Content-Length 必须 = body 字节数。
 * 如果只改 body 不改 Content-Length：
 *   - 字节多了 → 浏览器截断（只读 Content-Length 个字节）
 *   - 字节少了 → 等待超时（等更多数据到达）
 */
function applyModifyBody(
  response: ParsedHttpResponse,
  action: ModifyBodyAction,
): ParsedHttpResponse {
  const findType = action.findType ?? "string";

  let newBody: string;
  if (findType === "regex") {
    try {
      const regex = new RegExp(action.find, "g");
      newBody = response.body.replace(regex, action.replace);
    } catch {
      console.error(`[pipeline] invalid regex: /${action.find}/`);
      insertLog({
        level: "error",
        category: "pipeline",
        message: `invalid regex: /${action.find}/`,
      });
      return response;
    }
  } else {
    newBody = response.body.replaceAll(action.find, action.replace);
  }

  if (newBody === response.body) return response;

  const oldLen = Buffer.byteLength(response.body);
  const newLen = Buffer.byteLength(newBody);
  console.log(`[pipeline] modifyBody: ${oldLen}B → ${newLen}B`);
  insertLog({
    level: "info",
    category: "pipeline",
    message: `modifyBody: ${oldLen}B → ${newLen}B`,
  });
  return rebuildResponse(response, newBody);
}

// ============== Res Headers ==============

/**
 * 设置/删除响应头。
 *
 * set[key] = null  → 删除该头
 * set[key] = value → 设置/覆盖该头
 */
function applyResHeaders(
  response: ParsedHttpResponse,
  action: ResHeadersAction,
): ParsedHttpResponse {
  const newHeaders = { ...response.headers };

  for (const [key, value] of Object.entries(action.set)) {
    const lowerKey = key.toLowerCase();
    if (value === null) {
      delete newHeaders[lowerKey];
      console.log(`[pipeline] resHeaders: removed "${lowerKey}"`);
      insertLog({
        level: "info",
        category: "pipeline",
        message: `resHeaders: removed "${lowerKey}"`,
      });
    } else {
      newHeaders[lowerKey] = value;
      console.log(`[pipeline] resHeaders: set "${lowerKey}" = "${value}"`);
      insertLog({
        level: "info",
        category: "pipeline",
        message: `resHeaders: set "${lowerKey}" = "${value}"`,
      });
    }
  }

  // Headers 变了，重建 raw
  return rebuildResponse({ ...response, headers: newHeaders }, response.body);
}

// ============== Helpers ==============

/** 串联多个响应转换函数：f3 ∘ f2 ∘ f1 */
function composeTransforms(
  fns: Array<(resp: ParsedHttpResponse) => ParsedHttpResponse>,
): (resp: ParsedHttpResponse) => ParsedHttpResponse {
  return (resp) => fns.reduce((acc, fn) => fn(acc), resp);
}

/** 串联多个请求转换函数：f3 ∘ f2 ∘ f1 */
function composeRequestTransforms(
  fns: Array<(req: ParsedHttpRequest) => ParsedHttpRequest>,
): (req: ParsedHttpRequest) => ParsedHttpRequest {
  return (req) => fns.reduce((acc, fn) => fn(acc), req);
}

// ============== Req Headers ==============

function applyReqHeaders(
  request: ParsedHttpRequest,
  action: ReqHeadersAction,
): ParsedHttpRequest {
  const newHeaders = { ...request.headers };

  for (const [key, value] of Object.entries(action.set)) {
    const lowerKey = key.toLowerCase();
    if (value === null) {
      delete newHeaders[lowerKey];
      console.log(`[pipeline] reqHeaders: removed "${lowerKey}"`);
      insertLog({
        level: "info",
        category: "pipeline",
        message: `reqHeaders: removed "${lowerKey}"`,
      });
    } else {
      newHeaders[lowerKey] = value;
      console.log(`[pipeline] reqHeaders: set "${lowerKey}" = "${value}"`);
      insertLog({
        level: "info",
        category: "pipeline",
        message: `reqHeaders: set "${lowerKey}" = "${value}"`,
      });
    }
  }

  // 重建 raw
  return rebuildRequest({ ...request, headers: newHeaders });
}

// ============== Req Body ==============

function applyReqBody(
  request: ParsedHttpRequest,
  action: ReqBodyAction,
): ParsedHttpRequest {
  const findType = action.findType ?? "string";

  let newBody: string;
  if (findType === "regex") {
    try {
      const regex = new RegExp(action.find, "g");
      newBody = request.body.replace(regex, action.replace);
    } catch {
      console.error(`[pipeline] reqBody: invalid regex /${action.find}/`);
      insertLog({
        level: "error",
        category: "pipeline",
        message: `reqBody: invalid regex /${action.find}/`,
      });
      return request;
    }
  } else {
    newBody = request.body.replaceAll(action.find, action.replace);
  }

  if (newBody === request.body) return request;

  const oldLen = Buffer.byteLength(request.body);
  const newLen = Buffer.byteLength(newBody);
  console.log(`[pipeline] reqBody: ${oldLen}B → ${newLen}B`);
  insertLog({
    level: "info",
    category: "pipeline",
    message: `reqBody: ${oldLen}B → ${newLen}B`,
  });

  return rebuildRequest({
    ...request,
    body: newBody,
    headers: { ...request.headers, "content-length": String(newLen) },
  });
}

// ============== Helpers ==============

/** 用新 headers/body 重建请求对象（更新 raw） */
function rebuildRequest(request: ParsedHttpRequest): ParsedHttpRequest {
  const { method, url, httpVersion, headers, body } = request;
  const path = url.pathname + url.search;

  let raw = `${method} ${path} ${httpVersion}\r\n`;
  for (const [key, value] of Object.entries(headers)) {
    raw += `${key}: ${value}\r\n`;
  }
  raw += `\r\n`;
  if (body) raw += body;

  return { ...request, raw };
}

/** 用新 body 重建响应对象（更新 Content-Length + raw） */
function rebuildResponse(
  response: ParsedHttpResponse,
  newBody: string,
): ParsedHttpResponse {
  const newHeaders = { ...response.headers };
  newHeaders["content-length"] = String(Buffer.byteLength(newBody));

  let raw = `${response.httpVersion} ${response.statusCode} ${response.statusText}\r\n`;
  for (const [key, value] of Object.entries(newHeaders)) {
    raw += `${key}: ${value}\r\n`;
  }
  raw += `\r\n${newBody}`;

  return { ...response, headers: newHeaders, body: newBody, raw };
}

const STATUS_MAP: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};
