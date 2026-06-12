import { insertLog } from "./store/db.js";

export type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  category: string;
  message: string;
  sessionId?: number;
}

/**
 * 统一日志入口：同时写入 stdout/stderr 和 SQLite 持久化。
 */
function write(level: LogLevel, entry: LogEntry): void {
  const prefix = `[${entry.category}]`;

  if (level === "error") {
    console.error(prefix, entry.message);
  } else if (level === "warn") {
    console.warn(prefix, entry.message);
  } else {
    console.log(prefix, entry.message);
  }

  insertLog({
    level,
    category: entry.category,
    message: entry.message,
    sessionId: entry.sessionId,
  });
}

export const logger = {
  info: (entry: LogEntry) => write("info", entry),
  warn: (entry: LogEntry) => write("warn", entry),
  error: (entry: LogEntry) => write("error", entry),
};
