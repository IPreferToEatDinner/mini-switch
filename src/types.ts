import type { Socket } from "node:net";

/**
 * 解析后的 HTTP 请求。
 *
 * 在正向代理中，请求行包含绝对 URL：
 *   GET http://example.com/path HTTP/1.1
 */
export interface ParsedHttpRequest {
  method: string;
  url: URL;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
  /** 要转发给目标服务器的原始字节（头部 + body） */
  raw: string;
}

/**
 * HTTP 解析器的返回值。
 *
 * 解析成功时返回解析结果和消耗的字节数。
 * 调用方必须从缓冲区中移除这些字节，再尝试解析下一条消息。
 */
export interface ParseResult {
  request: ParsedHttpRequest;
  /** 从输入缓冲区中消耗的字节数 */
  bytesConsumed: number;
}

/** CLI / 运行时配置 */
export interface ProxyConfig {
  port: number;
  host: string;
}

/** 代理会话中传递的上下文 */
export interface ProxyContext {
  request: ParsedHttpRequest;
  clientSocket: Socket;
}

/**
 * 解析后的 HTTP 响应。
 *
 * 与请求不同，请求行是 METHOD URL VERSION，
 * 响应行是 VERSION STATUS_CODE STATUS_TEXT。
 */
export interface ParsedHttpResponse {
  statusCode: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
  /** 要转发给客户端的原始字节（状态行 + 头部 + body） */
  raw: string;
}

/**
 * HTTP 响应解析器的返回值 —— 联合类型，对应 3 种 body 分帧方式。
 *
 *  HTTP/1.1 有三种标记 body 结束的方式：
 *    1. Content-Length                         → complete（精确字节数）
 *    2. Transfer-Encoding: chunked             → complete（分段解码）
 *    3. 两者都没有 + 服务器关连接              → need-close（等 socket close）
 */
export interface ParseResponseComplete {
  type: "complete";
  response: ParsedHttpResponse;
  bytesConsumed: number;
}

export interface ParseResponseNeedClose {
  type: "need-close";
  statusCode: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string>;
  /** 状态行 + 头部 + \r\n\r\n 的原始字节 */
  headRaw: string;
  /** \r\n\r\n 在原始 buffer 中的起始位置 */
  headEnd: number;
}

export type ParseHttpResponseResult =
  | ParseResponseComplete
  | ParseResponseNeedClose
  | null;

// =============== 规则引擎 ===============

/**
 * 规则配置文件的顶层结构。
 *
 * 规则按数组顺序匹配，命中第一条即停止。
 * 放在数组前面的规则优先级更高。
 */
export interface RuleConfig {
  rules: ProxyRule[];
}

/**
 * 单条代理规则 = 匹配条件 + 动作管线。
 *
 * match 三字段之间是 AND 关系。
 * actions 按数组顺序依次执行（pipeline），上一动作的输出是下一动作的输入。
 */
export interface ProxyRule {
  name: string;
  enabled?: boolean;
  match: RuleMatch;
  /** 动作管线 —— 同一规则可叠加多个动作，按顺序执行 */
  actions: RuleAction[];
}

export interface RuleMatch {
  method?: string;   // HTTP 方法，* 匹配全部
  hostname?: string; // glob，如 "*.example.com"
  path?: string;     // glob，如 "/api/**"
}

/**
 * 规则动作 —— 联合类型。
 *
 * 每个 action 只做一件事，多个 action 组合实现复杂行为：
 *   actions: [delay, resHeaders, modifyBody]
 * 先延迟 → 再加 CORS 头 → 再替换 body 内容。
 *
 * ┌────────────┬───────────────────────────────────────────┐
 * │  动作       │  对应的网络知识                             │
 * ├────────────┼───────────────────────────────────────────┤
 * │  mock      │  强缓存思想：不发网络请求，直接用本地数据      │
 * │  delay     │  手动注入延迟，观察 TCP 重传/RTO 的影响      │
 * │  modifyBody│  Content-Length 必须和 body 字节数严格一致    │
 * │  resHeaders│  Cache-Control / CORS 等头对缓存和跨域的影响  │
 * └────────────┴───────────────────────────────────────────┘
 */
export type RuleAction =
  | MockAction
  | DelayAction
  | ModifyBodyAction
  | ResHeadersAction
  | ReqHeadersAction
  | ReqBodyAction
  | RedirectAction;

// ---- Mock ----

export interface MockAction {
  type: "mock";
  statusCode?: number;
  file?: string;
  body?: string;
  headers?: Record<string, string>;
}

// ---- Delay ----

export interface DelayAction {
  type: "delay";
  ms: number;
  phase?: "request" | "response" | "both";
}

// ---- Modify Response Body ----

export interface ModifyBodyAction {
  type: "modifyBody";
  find: string;
  replace: string;
  findType?: "string" | "regex";
}

// ---- Response Headers ----

export interface ResHeadersAction {
  type: "resHeaders";
  set: Record<string, string | null>;
}

// ---- Request Headers (new) ----

/**
 * 修改/添加请求头（转发给目标服务器之前）。
 *
 * 对应知识点：
 *  - 删 accept-encoding → 拿原始未压缩响应（方便查看）
 *  - 加 authorization → 绕过认证调试 API
 *  - 改 user-agent → 模拟不同客户端
 */
export interface ReqHeadersAction {
  type: "reqHeaders";
  set: Record<string, string | null>;
}

// ---- Request Body (new) ----

/**
 * 修改请求体（转发给目标服务器之前）。
 *
 * 对应知识点：
 *  - 篡改 POST body → 观察服务器如何响应不同数据
 *  - Content-Length 与 body 字节数一致的问题
 */
export interface ReqBodyAction {
  type: "reqBody";
  find: string;
  replace: string;
  findType?: "string" | "regex";
}

// ---- Redirect (new) ----

/**
 * 重定向到另一个 URL。
 *
 * 对应知识点：HTTP 重定向（301/302）与代理层重定向的区别。
 *
 * HTTP 重定向是服务器告诉浏览器"去别的地方"，
 * 代理层重定向是"浏览器以为自己连的是 A，实际上代理连的是 B"，
 * 浏览器全程不知情。
 */
export interface RedirectAction {
  type: "redirect";
  /** 目标 URL，替换原始请求的 host + path */
  url: string;
}

// =============== Action Pipeline ===============

/**
 * 动作管线执行后的计划。
 *
 * pipeline 不做 I/O，只产出"应该做什么"的描述，
 * http-proxy 负责执行（建立连接、写数据、setTimeout）。
 */
export interface ActionPlan {
  /** 如果设置，直接返回此响应，不连接目标服务器（mock 动作会设这个） */
  mock?: ParsedHttpResponse;

  /** 转发给目标前的延迟毫秒数 */
  requestDelay?: number;

  /** 返回给客户端前的延迟毫秒数 */
  responseDelay?: number;

  /**
   * 请求转换函数 —— 管道串联所有 onRequest 动作（reqHeaders + reqBody）。
   *
   * 在构造转发数据之前调用，输入原始请求，输出修改后的请求。
   * 返回 null 表示请求已被完全处理（如 redirect）。
   */
  transformRequest: (req: ParsedHttpRequest) => ParsedHttpRequest;

  /** 响应转换函数 —— 管道串联所有 onResponse 动作 */
  transformResponse: (resp: ParsedHttpResponse) => ParsedHttpResponse;

  /**
   * 重定向目标 URL。
   *
   * 如果设置，http-proxy 应连接此 URL 而非原始请求的 URL。
   * redirect action 会设置此字段。
   */
  redirectUrl?: string;
}
