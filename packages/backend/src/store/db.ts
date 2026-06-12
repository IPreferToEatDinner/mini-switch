import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-sqlite";
import { logs, sessions, type Log, type Session } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "..", "..", "mini-switch.db");

const client = new DatabaseSync(DB_PATH);
client.exec("PRAGMA journal_mode = WAL");
client.exec("PRAGMA foreign_keys = ON");

const db = drizzle({ client });

// ==================== Session operations ====================

export interface InsertSessionParams {
  method: string;
  url: string;
  host: string;
  path: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  matchedRules?: string[];
}

export interface UpdateSessionParams {
  statusCode?: number;
  statusText?: string;
  contentType?: string;
  responseSize?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  durationMs?: number;
  error?: string;
}

export function insertSession(params: InsertSessionParams): number {
  const result = db
    .insert(sessions)
    .values({
      startedAt: new Date().toISOString(),
      method: params.method,
      url: params.url,
      host: params.host,
      path: params.path,
      requestHeaders: params.requestHeaders
        ? JSON.stringify(params.requestHeaders)
        : null,
      requestBody: params.requestBody ?? null,
      matchedRules: params.matchedRules
        ? JSON.stringify(params.matchedRules)
        : null,
    })
    .returning({ id: sessions.id })
    .get();
  return result.id;
}

export function updateSession(
  id: number,
  params: UpdateSessionParams,
): void {
  const data: Record<string, unknown> = {};

  if (params.statusCode !== undefined) data.statusCode = params.statusCode;
  if (params.statusText !== undefined) data.statusText = params.statusText;
  if (params.contentType !== undefined) data.contentType = params.contentType;
  if (params.responseSize !== undefined) data.responseSize = params.responseSize;
  if (params.responseHeaders !== undefined) {
    data.responseHeaders = JSON.stringify(params.responseHeaders);
  }
  if (params.responseBody !== undefined) data.responseBody = params.responseBody;
  if (params.durationMs !== undefined) data.durationMs = params.durationMs;
  if (params.error !== undefined) data.error = params.error;

  if (Object.keys(data).length === 0) return;

  db.update(sessions).set(data).where(eq(sessions.id, id)).run();
}

export type SessionRecord = Session;

export function querySessions(
  limit = 50,
  offset = 0,
): SessionRecord[] {
  return db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getSession(id: number): SessionRecord | undefined {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();
}

export function clearSessions(): void {
  db.delete(sessions).run();
}

export function getSessionCount(): number {
  const rows = db.select({ cnt: count() }).from(sessions).all();
  return rows[0]?.cnt ?? 0;
}

// ==================== Log operations ====================

export interface InsertLogParams {
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  sessionId?: number;
}

export function insertLog(params: InsertLogParams): void {
  db.insert(logs)
    .values({
      timestamp: new Date().toISOString(),
      level: params.level,
      category: params.category,
      message: params.message,
      sessionId: params.sessionId ?? null,
    })
    .run();
}

export type LogRecord = Log;

export function queryLogs(
  limit = 100,
  offset = 0,
  level?: string,
): LogRecord[] {
  if (level === "info" || level === "warn" || level === "error") {
    return db
      .select()
      .from(logs)
      .where(eq(logs.level, level))
      .orderBy(desc(logs.timestamp))
      .limit(limit)
      .offset(offset)
      .all();
  }

  return db
    .select()
    .from(logs)
    .orderBy(desc(logs.timestamp))
    .limit(limit)
    .offset(offset)
    .all();
}

export function clearLogs(): void {
  db.delete(logs).run();
}

export function getLogCount(): number {
  const rows = db.select({ cnt: count() }).from(logs).all();
  return rows[0]?.cnt ?? 0;
}

// ==================== Maintenance ====================

/** 清理超过 maxRecords 条的旧记录 */
export function vacuum(maxRecords = 10000): void {
  const sessionCount = getSessionCount();
  if (sessionCount > maxRecords) {
    const cutoff = db
      .select({ id: sessions.id })
      .from(sessions)
      .orderBy(desc(sessions.startedAt))
      .limit(1)
      .offset(maxRecords)
      .get();
    if (cutoff) {
      db.delete(sessions).where(sql`${sessions.id} < ${cutoff.id}`).run();
    }
  }

  const logCount = getLogCount();
  if (logCount > maxRecords) {
    const cutoff = db
      .select({ id: logs.id })
      .from(logs)
      .orderBy(desc(logs.timestamp))
      .limit(1)
      .offset(maxRecords)
      .get();
    if (cutoff) {
      db.delete(logs).where(sql`${logs.id} < ${cutoff.id}`).run();
    }
  }
}
