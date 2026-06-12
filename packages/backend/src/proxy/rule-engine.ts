import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ParsedHttpRequest,
  ProxyRule,
  RuleAction,
  RuleConfig,
} from "../types.js";
import { logger } from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 规则引擎 —— 加载规则 + URL 匹配。
 *
 * 匹配模式：全匹配累加（whistle 风格）。
 *
 * 所有命中的规则，其 actions 按规则声明顺序合并为一个管线。
 * 这意味着你可以用一条全局规则（如"所有请求去掉缓存"）+
 * 一条精确规则（如"某个 API mock"），两种 actions 同时生效。
 */

export function loadRules(filePath?: string): ProxyRule[] {
  const defaultPath = resolve(__dirname, "..", "..", "mini-switch.rules.json");
  const path = filePath ?? defaultPath;

  try {
    const raw = readFileSync(path, "utf-8");
    const config: RuleConfig = JSON.parse(raw);
    const enabled = (config.rules ?? []).filter((r) => r.enabled !== false);
    logger.info({
      category: "rule-engine",
      message: `Loaded ${enabled.length}/${config.rules.length} rules from ${path}`,
    });
    return enabled;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      logger.warn({
        category: "rule-engine",
        message: `No config file at ${path}, running without rules`,
      });
      return [];
    }
    logger.error({
      category: "rule-engine",
      message: `Failed to load ${path}: ${(err as Error).message}`,
    });
    return [];
  }
}

/**
 * 为请求匹配所有命中的规则，合并其 actions 数组。
 *
 * 规则按声明顺序匹配，命中规则的 actions 按顺序拼接。
 * 返回空数组 = 没有规则命中 → 正常代理。
 */
export function matchActions(
  request: ParsedHttpRequest,
  rules: ProxyRule[],
): RuleAction[] | null {
  const allActions: RuleAction[] = [];

  for (const rule of rules) {
    if (matchCondition(request, rule.match)) {
      logger.info({
        category: "rule-engine",
        message: `"${rule.name}" matched ${request.method} ${request.url.href}`,
      });
      allActions.push(...rule.actions);
    }
  }

  return allActions.length > 0 ? allActions : null;
}

function matchCondition(
  request: ParsedHttpRequest,
  match: ProxyRule["match"],
): boolean {
  if (match.method && match.method !== "*") {
    if (request.method.toUpperCase() !== match.method.toUpperCase())
      return false;
  }

  if (match.hostname && match.hostname !== "*") {
    if (!globMatch(match.hostname, request.url.hostname)) return false;
  }

  if (match.path && match.path !== "*") {
    const fullPath = request.url.pathname + request.url.search;
    if (!globMatch(match.path, fullPath)) return false;
  }

  return true;
}

/**
 * 简单 glob 匹配。
 *
 * *   → 单段（不含 /）
 * **  → 多段（含 /）
 */
export function globMatch(pattern: string, target: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(target);
}

function globToRegex(pattern: string): RegExp {
  const escaped = escapeRegex(pattern);
  const withDoubleStar = escaped.replace(/\\\*\\\*/g, ".*");
  const withSingleStar = withDoubleStar.replace(/\\\*/g, "[^/]*");
  return new RegExp(`^${withSingleStar}$`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}
