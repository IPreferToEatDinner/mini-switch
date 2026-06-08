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
