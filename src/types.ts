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
