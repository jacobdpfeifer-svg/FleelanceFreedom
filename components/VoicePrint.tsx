/** Deterministic 7-bar symmetric waveform sigil. No animation, no deps. */

function hashStr(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function lcg(n: number): number {
  return (n * 1664525 + 1013904223) >>> 0;
}

/** Returns 7 bar heights in [4, 20], symmetric around center. */
function barHeights(seed: string): number[] {
  let h = hashStr(seed);
  const unique: number[] = [];
  for (let i = 0; i < 4; i++) {
    h = lcg(h);
    unique.push(4 + ((h & 0xffff) / 0xffff) * 16);
  }
  // Mirror: [outer, mid-outer, mid-inner, center, mid-inner, mid-outer, outer]
  return [unique[3], unique[2], unique[1], unique[0], unique[1], unique[2], unique[3]];
}

export interface VoiceprintProps {
  seed: string;
}

export default function VoicePrint({ seed }: VoiceprintProps) {
  const W = 48;
  const H = 24;
  const cy = H / 2;
  const heights = barHeights(seed);
  const xs = heights.map((_, i) => 4 + (i * (W - 8)) / 6);

  return (
    <svg
      aria-hidden="true"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      {heights.map((barH, i) => (
        <line
          key={i}
          x1={xs[i]}
          y1={cy - barH / 2}
          x2={xs[i]}
          y2={cy + barH / 2}
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
