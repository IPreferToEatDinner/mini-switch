import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    startedAt: text("started_at").notNull(),
    method: text("method").notNull(),
    url: text("url").notNull(),
    host: text("host").notNull(),
    path: text("path").notNull(),
    statusCode: integer("status_code"),
    statusText: text("status_text"),
    contentType: text("content_type"),
    responseSize: integer("response_size"),
    requestHeaders: text("request_headers"), // JSON
    requestBody: text("request_body"),
    responseHeaders: text("response_headers"), // JSON
    responseBody: text("response_body"),
    matchedRules: text("matched_rules"), // JSON array
    durationMs: integer("duration_ms"),
    error: text("error"),
  },
  (table) => [
    index("idx_sessions_started").on(table.startedAt),
    index("idx_sessions_host").on(table.host),
  ],
);

export const logs = sqliteTable(
  "logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    timestamp: text("timestamp").notNull(),
    level: text("level", { enum: ["info", "warn", "error"] }).notNull(),
    category: text("category"),
    message: text("message").notNull(),
    sessionId: integer("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("idx_logs_timestamp").on(table.timestamp),
    index("idx_logs_session").on(table.sessionId),
  ],
);

export const rules = sqliteTable(
  "rules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    /** JSON: RuleMatch { method?, hostname?, path? } */
    match: text("match").notNull(),
    /** JSON: RuleAction[] */
    actions: text("actions").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_rules_name").on(table.name)],
);

export type Session = typeof sessions.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type Rule = typeof rules.$inferSelect;
