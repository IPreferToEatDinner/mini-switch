import { cn } from "@/src/lib/utils";
import { useState } from "react";
import type { SessionRecord } from "../../api/client";
import { KVRows } from "../ui/KVRows";
import { Panel } from "../ui/Panel";

export type InspectorTab = "request" | "response" | "rules";
export type SubTab = "headers" | "body" | "cookies" | "raw";

const INSPECTOR_TABS: InspectorTab[] = ["request", "response", "rules"];
const SUB_TABS: SubTab[] = ["headers", "body", "cookies", "raw"];

interface InspectorPanelProps {
  session: SessionRecord | null;
}

function parseJsonField(val: string | null): Record<string, string> | null {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** 右侧检查器面板：请求/响应/规则 Tab + 子标签 */
export function InspectorPanel({ session }: InspectorPanelProps) {
  const [tab, setTab] = useState<InspectorTab>("request");
  const [sub, setSub] = useState<SubTab>("headers");

  const reqHeaders = parseJsonField(session?.requestHeaders ?? null);
  const resHeaders = parseJsonField(session?.responseHeaders ?? null);
  const matchedRules = session?.matchedRules
    ? (JSON.parse(session.matchedRules) as string[])
    : null;

  const generalItems = session
    ? [
        { key: "Request URL:", value: session.url },
        { key: "Request Method:", value: session.method },
        {
          key: "Status Code:",
          value: session.statusCode
            ? `${session.statusCode} ${session.statusText ?? ""}`
            : "pending...",
          valueColor:
            session.statusCode && session.statusCode < 300
              ? "green"
              : session.statusCode && session.statusCode >= 400
                ? "red"
                : undefined,
        },
        { key: "Host:", value: session.host },
        {
          key: "Response Size:",
          value: formatSize(session.responseSize),
        },
        {
          key: "Duration:",
          value: formatDuration(session.durationMs),
        },
        {
          key: "Content Type:",
          value: session.contentType ?? "--",
        },
        {
          key: "Error:",
          value: session.error ?? "--",
          valueColor: session.error ? "red" : undefined,
        },
      ]
    : [];

  const headerItems =
    tab === "request"
      ? reqHeaders
        ? Object.entries(reqHeaders).map(([key, value]) => ({
            key: `${key}:`,
            value,
          }))
        : []
      : resHeaders
        ? Object.entries(resHeaders).map(([key, value]) => ({
            key: `${key}:`,
            value,
          }))
        : [];

  return (
    <Panel className="w-[400px] shrink-0">
      {/* Main Tabs */}
      <div className="flex h-11 items-end gap-0.5 border-b border-white/[0.08] px-1.5">
        {INSPECTOR_TABS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-t-lg border-none bg-transparent px-3.5 py-1.5 font-[inherit] text-xs transition-all duration-200",
              tab === t
                ? "border-b-2 border-white/30 bg-white/[0.08] text-nova-primary"
                : "text-nova-tertiary",
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-white/5 px-1">
        {SUB_TABS.map((st) => (
          <button
            type="button"
            key={st}
            onClick={() => setSub(st)}
            className={cn(
              "cursor-pointer border-b-2 border-none bg-transparent px-3 py-1.5 font-[inherit] text-[10px] uppercase tracking-[0.05em]",
              sub === st
                ? "border-b-white/40 text-nova-primary"
                : "border-b-transparent text-nova-tertiary",
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {!session && (
          <div className="flex h-full items-center justify-center text-xs text-nova-tertiary">
            Select a session to inspect
          </div>
        )}

        {session && sub === "headers" && (
          <KVRows
            groups={[
              { title: "General", items: generalItems },
              ...(headerItems.length > 0
                ? [
                    {
                      title:
                        tab === "request"
                          ? "Request Headers"
                          : "Response Headers",
                      items: headerItems,
                    },
                  ]
                : []),
            ]}
          />
        )}

        {session && sub === "body" && (
          <div className="font-mono text-[11px] text-nova-secondary whitespace-pre-wrap break-all">
            {tab === "request"
              ? session.requestBody || (
                  <span className="text-nova-tertiary italic">(empty)</span>
                )
              : session.responseBody || (
                  <span className="text-nova-tertiary italic">(empty)</span>
                )}
          </div>
        )}

        {session && sub === "raw" && (
          <div className="font-mono text-[11px] text-nova-secondary whitespace-pre-wrap break-all">
            <div className="mb-2 text-nova-tertiary">
              {tab === "request" ? "Request" : "Response"} Raw:
            </div>
            {tab === "request"
              ? `${session.method} ${session.path} HTTP/1.1\n${
                  reqHeaders
                    ? Object.entries(reqHeaders)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("\n")
                    : ""
                }\n\n${session.requestBody ?? ""}`
              : `HTTP/1.1 ${session.statusCode} ${session.statusText}\n${
                  resHeaders
                    ? Object.entries(resHeaders)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("\n")
                    : ""
                }\n\n${session.responseBody ?? ""}`}
          </div>
        )}

        {session && sub === "cookies" && (
          <div className="text-xs text-nova-tertiary">
            Cookie inspection not yet implemented.
          </div>
        )}

        {session && tab === "rules" && (
          <div className="font-mono text-[11px] text-nova-secondary">
            {matchedRules && matchedRules.length > 0 ? (
              <>
                <div className="mb-2 text-nova-tertiary">
                  Matched Rules ({matchedRules.length}):
                </div>
                <ul className="list-disc pl-4">
                  {matchedRules.map((rule, i) => (
                    <li key={i} className="mb-1">
                      {rule}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-nova-tertiary italic">
                No rules matched this request.
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
