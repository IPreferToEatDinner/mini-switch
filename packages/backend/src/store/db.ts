import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-sqlite";
import {
  logs,
  rules,
  sessions,
  type Log,
  type Rule,
  type Session,
} from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = resolve(__dirname, "..", "..");
const DB_PATH = resolve(DB_DIR, "mini-switch.db");

/** 确保数据目录存在 */
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

const client = new DatabaseSync(DB_PATH);
client.exec("PRAGMA journal_mode = WAL");
client.exec("PRAGMA foreign_keys = ON");

const db = drizzle({ client });

/** 首次运行时自动创建所有表与索引（幂等，已有表则跳过） */
function ensureTables(): void {
  client.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      host TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER,
      status_text TEXT,
      content_type TEXT,
      response_size INTEGER,
      request_headers TEXT,
      request_body TEXT,
      response_headers TEXT,
      response_body TEXT,
      matched_rules TEXT,
      duration_ms INTEGER,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_host ON sessions(host);

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error')),
      category TEXT,
      message TEXT NOT NULL,
      session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_session ON logs(session_id);

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      match TEXT NOT NULL,
      actions TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rules_name ON rules(name);
  `);
}

ensureTables();

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

/** 过滤掉值为 undefined 的字段，避免 Drizzle 将其设置为 NULL */
function omitUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function updateSession(
  id: number,
  params: UpdateSessionParams,
): void {
  const data = omitUndefined({
    statusCode: params.statusCode,
    statusText: params.statusText,
    contentType: params.contentType,
    responseSize: params.responseSize,
    responseHeaders:
      params.responseHeaders !== undefined
        ? JSON.stringify(params.responseHeaders)
        : undefined,
    responseBody: params.responseBody,
    durationMs: params.durationMs,
    error: params.error,
  });

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

// ==================== Rule operations ====================

export interface InsertRuleParams {
  name: string;
  enabled?: boolean;
  match: Record<string, unknown>;
  actions: Record<string, unknown>[];
}

export interface UpdateRuleParams {
  name?: string;
  enabled?: boolean;
  match?: Record<string, unknown>;
  actions?: Record<string, unknown>[];
}

export function insertRule(params: InsertRuleParams): number {
  const now = new Date().toISOString();
  const result = db
    .insert(rules)
    .values({
      name: params.name,
      enabled: params.enabled ?? true,
      match: JSON.stringify(params.match),
      actions: JSON.stringify(params.actions),
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: rules.id })
    .get();
  return result.id;
}

export function updateRule(id: number, params: UpdateRuleParams): void {
  const data = omitUndefined({
    name: params.name,
    enabled: params.enabled,
    match: params.match !== undefined ? JSON.stringify(params.match) : undefined,
    actions:
      params.actions !== undefined
        ? JSON.stringify(params.actions)
        : undefined,
    updatedAt: new Date().toISOString(),
  });

  if (Object.keys(data).length === 0) return;
  db.update(rules).set(data).where(eq(rules.id, id)).run();
}

export type RuleRecord = Rule;

export function queryRules(): RuleRecord[] {
  return db.select().from(rules).orderBy(rules.name).all();
}

export function getRule(id: number): RuleRecord | undefined {
  return db.select().from(rules).where(eq(rules.id, id)).get();
}

export function deleteRule(id: number): void {
  db.delete(rules).where(eq(rules.id, id)).run();
}

export function getEnabledRules(): RuleRecord[] {
  return db
    .select()
    .from(rules)
    .where(eq(rules.enabled, true))
    .orderBy(rules.name)
    .all();
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
