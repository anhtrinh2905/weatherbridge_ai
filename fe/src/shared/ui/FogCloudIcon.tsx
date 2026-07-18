import { useId } from "react";
import { cn } from "../lib/cn";

/** Soft volumetric fog cloud — cool gray depths, bright rim, soft AO underbelly. */
export function FogCloudIcon({
  size = 36,
  severity = 0.6,
  className,
  animated = true,
}: {
  size?: number;
  /** 0..1 WMO visibility deficit — denser fog → larger / more opaque puff. */
  severity?: number;
  className?: string;
  animated?: boolean;
}) {
  const s = Math.max(0, Math.min(1, severity));
  const height = Math.round(size * 0.58);
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 72 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0 overflow-visible", animated && "fog-cloud-float", className)}
      aria-hidden="true"
      style={{ opacity: 0.88 + 0.12 * s }}
    >
      <defs>
        {/* Ambient haze behind the cloud */}
        <radialGradient id={`${uid}-haze`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#9aadc4" stopOpacity={0.35 + 0.25 * s} />
          <stop offset="55%" stopColor="#6d8299" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#4a5c70" stopOpacity="0" />
        </radialGradient>

        {/* Body: bright cool top → slate mid → deep blue-gray belly */}
        <linearGradient id={`${uid}-body`} x1="20" y1="6" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#e8eef6" />
          <stop offset="62%" stopColor="#b7c5d6" />
          <stop offset="100%" stopColor="#7a8fa8" />
        </linearGradient>

        {/* Secondary lobe — slightly cooler */}
        <linearGradient id={`${uid}-lobe`} x1="8" y1="12" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5f8fc" />
          <stop offset="55%" stopColor="#a8b9cc" />
          <stop offset="100%" stopColor="#6b7f96" />
        </linearGradient>

        <linearGradient id={`${uid}-rim`} x1="24" y1="8" x2="40" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <filter id={`${uid}-depth`} x="-25%" y="-35%" width="150%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="blur" />
          <feOffset dy="2.2" result="off" />
          <feFlood floodColor="#243246" floodOpacity="0.45" result="color" />
          <feComposite in="color" in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground haze / depth plate */}
      <ellipse cx="36" cy="34" rx={24 + 5 * s} ry={7 + 2 * s} fill={`url(#${uid}-haze)`} />

      <g filter={`url(#${uid}-depth)`}>
        {/* Rear cooler mass */}
        <ellipse cx="48" cy="20" rx={11 + 2 * s} ry={8 + s} fill={`url(#${uid}-lobe)`} opacity="0.92" />
        <ellipse cx="20" cy="22" rx={10 + 2 * s} ry={7.5 + s} fill={`url(#${uid}-lobe)`} opacity="0.88" />

        {/* Core volume */}
        <path
          d="M17.5 30.2c-5.4 0-9.8-3.5-9.8-7.9 0-4.3 4.1-7.7 9.2-7.9 1.1-4.6 5.4-7.9 10.7-7.9 4.6 0 8.5 2.4 10.2 5.9 1.3-.6 2.8-.9 4.4-.9 5.8 0 10.5 3.9 10.5 8.8 0 .5-.1 1-.2 1.5 3.6.9 6.1 3.6 6.1 6.9 0 3.9-3.6 7-8.1 7H17.5Z"
          fill={`url(#${uid}-body)`}
        />

        {/* Specular / rim light on top lobes */}
        <ellipse cx="30" cy="15.5" rx="8" ry="5.2" fill={`url(#${uid}-rim)`} />
        <ellipse cx="44" cy="14.5" rx="6" ry="4" fill={`url(#${uid}-rim)`} opacity="0.75" />

        {/* Occlusion crease between lobes */}
        <path
          d="M26 24c3.2 2.2 7.2 2.4 10.8.4"
          stroke="#5a6e86"
          strokeOpacity="0.28"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Soft fog sheets under the cloud — cooler, lower contrast */}
      <path
        d="M12 35.2c5-.9 10.2-.4 15.2.6 4.6.9 9.4 1 14 .1 4.4-.8 8.8-1.2 13.2-.2"
        stroke="#c5d0de"
        strokeOpacity={0.55 + 0.3 * s}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 38c4.2-.6 8.5-.2 12.6.5 4 .7 8.1.7 12.1 0"
        stroke="#8fa0b5"
        strokeOpacity={0.4 + 0.25 * s}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
