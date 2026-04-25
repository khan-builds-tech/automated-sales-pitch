"use client";

interface Props {
  score: number;
  label: string;
  size?: number;
  unavailable?: boolean;
}

export default function ScoreRing({ score, label, size = 90, unavailable = false }: Props) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = unavailable ? 0 : circumference - (score / 100) * circumference;

  const color = unavailable
    ? "#555"
    : score >= 80 ? "#22c55e"
    : score >= 50 ? "#eab308"
    : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#222" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={unavailable ? "4 6" : circumference}
            strokeDashoffset={offset}
            className={unavailable ? "" : "score-ring"}
            style={unavailable ? undefined : ({ "--score-offset": offset } as React.CSSProperties)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {unavailable ? "—" : score}
          </span>
        </div>
      </div>
      <span className="text-xs text-[#888] text-center leading-tight">{label}</span>
    </div>
  );
}
