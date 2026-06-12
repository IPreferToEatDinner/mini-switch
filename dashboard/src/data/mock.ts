import type { LucideIcon } from "lucide-react";
import { Box, Globe, Layers, List, Settings } from "lucide-react";

// ===== Activity Bar =====
export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

export const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: "network", icon: Globe, label: "Network" },
  { id: "rules", icon: List, label: "Rules" },
  { id: "values", icon: Box, label: "Values" },
  { id: "plugins", icon: Layers, label: "Plugins" },
];

export const ACTIVITY_SETTINGS: ActivityItem = {
  id: "settings",
  icon: Settings,
  label: "Settings",
};

// ===== Domains =====
export interface DomainItem {
  name: string;
  color?: string;
  active?: boolean;
}

export const MOCK_DOMAINS: DomainItem[] = [
  { name: "All Traffic", color: "var(--bg-ambient-1)", active: true },
  { name: "api.nebula.dev", color: "#61afef", active: true },
  { name: "cdn.static-assets.com" },
  { name: "google-analytics.com" },
  { name: "auth.internal.service" },
];

// ===== Sessions =====
export interface SessionItem {
  id: number;
  status: number;
  method: string;
  host: string;
  path: string;
  type: string;
  size: string;
  active?: boolean;
}

export const MOCK_SESSIONS: SessionItem[] = [
  {
    id: 1024,
    status: 200,
    method: "GET",
    host: "api.nebula.dev",
    path: "/v1/user/profile",
    type: "json",
    size: "1.2 KB",
  },
  {
    id: 1025,
    status: 200,
    method: "POST",
    host: "api.nebula.dev",
    path: "/v1/telemetry/heartbeat",
    type: "json",
    size: "458 B",
    active: true,
  },
  {
    id: 1026,
    status: 304,
    method: "GET",
    host: "cdn.nebula.dev",
    path: "/assets/main-Ea8s1.js",
    type: "js",
    size: "--",
  },
  {
    id: 1027,
    status: 200,
    method: "GET",
    host: "api.nebula.dev",
    path: "/v1/config/runtime",
    type: "yaml",
    size: "2.4 KB",
  },
  {
    id: 1028,
    status: 404,
    method: "GET",
    host: "internal.service",
    path: "/legacy/api/v2/stats",
    type: "html",
    size: "1.8 KB",
  },
  {
    id: 1029,
    status: 200,
    method: "OPTIONS",
    host: "api.nebula.dev",
    path: "/v1/telemetry/heartbeat",
    type: "plain",
    size: "0 B",
  },
  {
    id: 1030,
    status: 204,
    method: "PUT",
    host: "api.nebula.dev",
    path: "/v1/user/settings",
    type: "--",
    size: "0 B",
  },
  {
    id: 1031,
    status: 200,
    method: "GET",
    host: "github.com",
    path: "/notifications",
    type: "html",
    size: "124 KB",
  },
];

// ===== Logs =====
export interface LogEntry {
  id: number;
  time: string;
  level: "info" | "warn" | "error";
  text: string;
}

export const MOCK_LOGS: LogEntry[] = [
  { id: 1, time: "14:20:01", level: "info", text: "Proxy server listening on port 8899" },
  { id: 2, time: "14:20:05", level: "info", text: "HTTPS decryption enabled for *.nebula.dev" },
  { id: 3, time: "14:21:44", level: "warn", text: "Rule 'BlockAnalytics' applied to google-analytics.com" },
  { id: 4, time: "14:22:10", level: "info", text: "New session established from 127.0.0.1:54321" },
  { id: 5, time: "14:22:15", level: "info", text: "Intercepting POST /v1/telemetry/heartbeat" },
];

// ===== Inspector =====
export interface KVItem {
  key: string;
  value: string;
  valueColor?: string;
}

export interface KVGroup {
  title: string;
  items: KVItem[];
}

export const MOCK_REQUEST_GENERAL: KVGroup = {
  title: "General",
  items: [
    {
      key: "Request URL:",
      value: "https://api.nebula.dev/v1/telemetry/heartbeat",
    },
    { key: "Request Method:", value: "POST" },
    { key: "Status Code:", value: "200 OK", valueColor: "green" },
    { key: "Remote Address:", value: "34.102.11.4:443" },
  ],
};

export const MOCK_REQUEST_HEADERS: KVGroup = {
  title: "Request Headers",
  items: [
    { key: "accept:", value: "application/json" },
    { key: "content-type:", value: "application/json" },
    { key: "authorization:", value: "Bearer eyJhbGciOi..." },
    { key: "user-agent:", value: "NebulaProxy/1.0" },
    { key: "host:", value: "api.nebula.dev" },
  ],
};

export type InspectorTab = "request" | "response" | "rules";
export type SubTab = "headers" | "body" | "cookies" | "raw";

export const INSPECTOR_TABS: InspectorTab[] = ["request", "response", "rules"];
export const SUB_TABS: SubTab[] = ["headers", "body", "cookies", "raw"];
