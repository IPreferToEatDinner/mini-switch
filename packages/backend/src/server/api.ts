import { existsSync, readFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearLogs,
  clearSessions,
  getLogCount,
  getSession,
  getSessionCount,
  queryLogs,
  querySessions,
} from "../store/db.js";
import { logger } from "../logger.js";

const API_PORT = 6678;
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const STATIC_DIR = join(__dirname, "..", "..", "dist");

function json(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function sendError(res: ServerResponse, status: number, message: string): void {
  json(res, { error: message }, status);
}

function parseUrl(req: IncomingMessage) {
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );
  return url;
}

/** 从路径中提取 session id: /__api/sessions/42 → 42 */
function extractId(pathname: string): number | null {
  const match = pathname.match(/^\/__api\/sessions\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function handleApi(req: IncomingMessage, res: ServerResponse): boolean {
  const url = parseUrl(req);
  const { pathname } = url;
  const method = req.method?.toUpperCase() ?? "GET";

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return true;
  }

  // GET /__api/sessions
  if (pathname === "/__api/sessions" && method === "GET") {
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;
    const sessions = querySessions(limit, offset);
    const total = getSessionCount();
    json(res, { sessions, total });
    return true;
  }

  // GET /__api/sessions/:id
  if (pathname.startsWith("/__api/sessions/") && method === "GET") {
    const id = extractId(pathname);
    if (id === null) {
      sendError(res, 400, "Invalid session ID");
      return true;
    }
    const session = getSession(id);
    if (!session) {
      sendError(res, 404, "Session not found");
      return true;
    }
    json(res, session);
    return true;
  }

  // DELETE /__api/sessions
  if (pathname === "/__api/sessions" && method === "DELETE") {
    clearSessions();
    json(res, { ok: true });
    return true;
  }

  // GET /__api/logs
  if (pathname === "/__api/logs" && method === "GET") {
    const limit = Number(url.searchParams.get("limit")) || 100;
    const offset = Number(url.searchParams.get("offset")) || 0;
    const level = url.searchParams.get("level") ?? undefined;
    const logs = queryLogs(limit, offset, level);
    const total = getLogCount();
    json(res, { logs, total });
    return true;
  }

  // DELETE /__api/logs
  if (pathname === "/__api/logs" && method === "DELETE") {
    clearLogs();
    json(res, { ok: true });
    return true;
  }

  return false;
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const url = parseUrl(req);
  let filePath = join(STATIC_DIR, url.pathname);

  // SPA fallback: if path has no extension or doesn't exist, serve index.html
  if (!extname(filePath) || !existsSync(filePath)) {
    filePath = join(STATIC_DIR, "index.html");
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME[ext] ?? "application/octet-stream";

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end("Internal Server Error");
  }
}

export function startApiServer(): void {
  const server = createServer((req, res) => {
    // API 路由优先
    if (req.url?.startsWith("/__api/")) {
      handleApi(req, res);
      return;
    }

    // 静态文件（Dashboard 构建产物）
    serveStatic(req, res);
  });

  server.listen(API_PORT, "127.0.0.1", () => {
    console.log(
      `[api] Dashboard API listening on http://127.0.0.1:${API_PORT}`,
    );
    logger.info({
      category: "api",
      message: `Server started on port ${API_PORT}`,
    });
  });

  server.on("error", (err) => {
    logger.error({
      category: "api",
      message: `Server error: ${err.message}`,
    });
  });
}
