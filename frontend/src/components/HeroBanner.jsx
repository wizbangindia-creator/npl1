import { Sparkles, Clock, Crown, Zap, Trophy, Flame } from "lucide-react";

/**
 * Colourful hero banner with:
 *  - Animated gradient blobs behind the title
 *  - Rainbow gradient headline
 *  - Full-width scrolling marquee ticker
 */
export default function HeroBanner({ items = [], children }) {
  const base = items.length
    ? items
    : [
        { icon: Sparkles, text: "NPL1 · Live Daily Draws" },
        { icon: Clock, text: "Main Board · 9:00 AM – 10:00 PM IST" },
        { icon: Crown, text: "Super Draw at 11:30 AM Daily" },
        { icon: Zap, text: "63 Live Draws Every Day" },
        { icon: Trophy, text: "Results Revealed Live" },
        { icon: Flame, text: "Two Digits · A · B · C" },
      ];
  const track = [...base, ...base];

  return (
    <div className="hero-wrap" data-testid="hero-wrap">
      <div className="hero-marquee" data-testid="hero-marquee">
        <div className="hero-marquee-track">
          {track.map((it, i) => {
            const Icon = it.icon || Sparkles;
            return (
              <span key={i} className="hero-marquee-item">
                <Icon size={13} />
                <span>{it.text}</span>
                <span className="hero-marquee-dot" aria-hidden>◆</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="hero">
        <div className="hero-blob b1" aria-hidden />
        <div className="hero-blob b2" aria-hidden />
        <div className="hero-blob b3" aria-hidden />
        <div className="hero-blob b4" aria-hidden />
        <span className="hero-star s1" aria-hidden>✦</span>
        <span className="hero-star s2" aria-hidden>✧</span>
        <span className="hero-star s3" aria-hidden>✦</span>
        <span className="hero-star s4" aria-hidden>✧</span>
        <div className="hero-inner">{children}</div>
      </div>
    </div>
  );
}
