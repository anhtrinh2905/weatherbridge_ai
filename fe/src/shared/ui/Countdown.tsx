import { useEffect, useState } from "react";

function format(msRemaining: number) {
  if (msRemaining <= 0) return "Đã quá hạn";
  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export function Countdown({ deadlineUtc }: { deadlineUtc: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const deadline = new Date(deadlineUtc).getTime();
  const remaining = deadline - now;
  const expired = remaining <= 0;

  return (
    <span className={expired ? "font-semibold text-danger" : "font-semibold text-fg-strong"}>
      {expired ? "Đã quá hạn hành động" : `Còn ${format(remaining)}`}
    </span>
  );
}
