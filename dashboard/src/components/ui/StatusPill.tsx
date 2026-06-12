import { statusClass } from "../../data/mock";

interface StatusPillProps {
  status: number;
}

/** 状态码标签（2xx 绿 / 304 黄 / 4xx 红 / 204 蓝） */
export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`status-pill ${statusClass(status)}`}>{status} OK</span>
  );
}
