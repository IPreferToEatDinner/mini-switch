interface StatusPillProps {
  status: number;
}

const statusStyle = (code: number) => {
  if (code === 200) return "text-nova-green border-nova-green/20";
  if (code === 304) return "text-nova-yellow border-nova-yellow/20";
  if (code === 404) return "text-nova-red border-nova-red/20";
  if (code === 204) return "text-nova-blue border-nova-blue/20";
  if (code >= 400) return "text-nova-red border-nova-red/20";
  return "text-nova-green border-nova-green/20";
};

/** 状态码标签（2xx 绿 / 304 黄 / 4xx 红 / 204 蓝） */
export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`rounded-[3px] border bg-black/30 px-1.5 py-px font-mono font-semibold text-[10px] ${statusStyle(status)}`}
    >
      {status} OK
    </span>
  );
}
