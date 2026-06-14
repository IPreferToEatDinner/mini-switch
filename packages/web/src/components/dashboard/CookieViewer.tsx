interface CookieViewerProps {
  headers: Record<string, string> | null;
}

interface ParsedCookie {
  name: string;
  value: string;
  attributes: { key: string; value: string }[];
}

function parseSetCookie(raw: string): ParsedCookie | null {
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const first = parts[0];
  const eqIdx = first.indexOf("=");
  if (eqIdx === -1) return null;

  const name = first.slice(0, eqIdx).trim();
  const value = first.slice(eqIdx + 1).trim();

  const attributes = parts.slice(1).map((attr) => {
    const i = attr.indexOf("=");
    if (i === -1) return { key: attr, value: "✓" };
    return { key: attr.slice(0, i).trim(), value: attr.slice(i + 1).trim() };
  });

  return { name, value, attributes };
}

function parseCookiePairs(raw: string): ParsedCookie[] {
  const result: ParsedCookie[] = [];
  for (const pair of raw.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    result.push({
      name: trimmed.slice(0, eqIdx).trim(),
      value: trimmed.slice(eqIdx + 1).trim(),
      attributes: [],
    });
  }
  return result;
}

/** Cookie 解析展示组件 */
export function CookieViewer({ headers }: CookieViewerProps) {
  if (!headers) {
    return (
      <div className="text-xs text-nova-tertiary italic">
        No cookies found.
      </div>
    );
  }

  const cookies: {
    type: "request" | "response";
    parsed: ParsedCookie;
  }[] = [];

  for (const [headerKey, headerValue] of Object.entries(headers)) {
    if (/^cookie$/i.test(headerKey)) {
      // Request Cookie header: name=value; name2=value2
      const pairs = parseCookiePairs(headerValue);
      pairs.forEach((p) => cookies.push({ type: "request", parsed: p }));
    } else if (/^set-cookie$/i.test(headerKey)) {
      // Response Set-Cookie header: name=value; Path=/; HttpOnly
      const parsed = parseSetCookie(headerValue);
      if (parsed) cookies.push({ type: "response", parsed });
    }
  }

  if (cookies.length === 0) {
    return (
      <div className="text-xs text-nova-tertiary italic">No cookies found.</div>
    );
  }

  return (
    <div className="space-y-3">
      {cookies.map((cookie, ci) => (
        <div
          key={ci}
          className="rounded-lg border border-white/[0.05] bg-white/[0.02] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-nova-tertiary">
              {cookie.type === "request" ? "Cookie" : "Set-Cookie"}
            </span>
            <span className="font-mono text-[11px] text-nova-primary">
              {cookie.parsed.name}
            </span>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex gap-3">
              <span className="shrink-0 w-14 text-right text-[10px] uppercase text-nova-purple/70">
                Name
              </span>
              <span className="font-mono text-[11px] text-nova-primary break-all">
                {cookie.parsed.name}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-14 text-right text-[10px] uppercase text-nova-purple/70">
                Value
              </span>
              <span className="font-mono text-[11px] text-nova-secondary break-all">
                {cookie.parsed.value}
              </span>
            </div>

            {cookie.parsed.attributes.length > 0 && (
              <div className="pt-1">
                <div className="mb-1.5 text-[10px] uppercase text-nova-tertiary">
                  Attributes
                </div>
                <div className="space-y-1">
                  {cookie.parsed.attributes.map((attr, ai) => (
                    <div key={ai} className="flex gap-3">
                      <span className="shrink-0 font-mono text-[10px] text-nova-purple/60">
                        {attr.key}
                      </span>
                      <span className="font-mono text-[10px] text-nova-tertiary">
                        {attr.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
