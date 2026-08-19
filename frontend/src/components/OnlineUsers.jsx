import { useEffect, useState } from "react";
import { Users } from "lucide-react";

/**
 * Client-side "live" viewer counter that gently drifts up and down.
 * Not real presence data — a decorative liveness indicator.
 */
export default function OnlineUsers({ min = 180, max = 940 }) {
  const seed = () => {
    const t = new Date();
    const base = 320 + (t.getHours() * 17 + t.getMinutes()) % 250;
    return Math.min(max, Math.max(min, base + Math.floor(Math.random() * 180)));
  };
  const [count, setCount] = useState(seed);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        const delta = Math.floor(Math.random() * 17) - 8; // -8..+8
        let next = c + delta;
        if (next < min) next = min + Math.floor(Math.random() * 25);
        if (next > max) next = max - Math.floor(Math.random() * 25);
        return next;
      });
    }, 3200);
    return () => clearInterval(id);
  }, [min, max]);

  return (
    <div className="online-pill" data-testid="online-users">
      <span className="online-dot" aria-hidden />
      <Users size={13} className="online-icon" />
      <span className="online-count" data-testid="online-count">
        {count.toLocaleString()}
      </span>
      <span className="online-label">watching now</span>
    </div>
  );
}
