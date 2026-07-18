import { useMemo } from "react";
import { VILLAGES, getDominantLevel, getHazardLevel } from "../domain/mockData";
import { HAZARD_LEVEL_COLORS, TIER_COLORS } from "../domain/labels";
import type { HazardType, Tier, Village } from "../domain/types";
import { cn } from "../lib/cn";

/**
 * Lightweight substitute for the MapLibre GL raster heatmap specified in AD-4. There is no
 * COG/web-PNG pipeline behind this yet (no `ai/terrain` + worker render job exist), so this
 * plots resolved Mường Pồn village centroids only (see data/catalogs/muong_pon_villages_v1.json;
 * unresolved bản are omitted — no estimated coordinates) on a
 * normalized SVG canvas, colored by the mock hazard level. It communicates the same information
 * (which village, which level, click to inspect) without pretending to be a georeferenced raster.
 * Swap-in point for the real MapLibre component: same props (`layer`, `day`, `onVillageClick`).
 */

type Layer = HazardType | "dominant";

type LocatedVillage = Village & { lat: number; lon: number };

interface VillageMapProps {
  layer: Layer;
  day: number;
  detailLevel?: "full" | "simple"; // full = 5-level + click inspect; simple = 2-tier only
  focusVillageId?: string; // village_head / resident: crop/zoom to one village
  onVillageClick?: (villageId: string) => void;
  className?: string;
}

const PADDING = 0.02;

function levelForVillage(villageId: string, layer: Layer, day: number) {
  if (layer === "dominant") return getDominantLevel(villageId, day);
  return getHazardLevel(villageId, layer, day);
}

function tierColorForLevel(level: number): { fill: string; tier: Tier | null } {
  if (level >= 4) return { fill: TIER_COLORS.go_now, tier: "go_now" };
  if (level >= 2) return { fill: TIER_COLORS.prepare, tier: "prepare" };
  return { fill: "#3DD6A4", tier: null };
}

function isLocated(village: Village): village is LocatedVillage {
  return village.coordinateStatus === "resolved" && village.lat !== null && village.lon !== null;
}

export function VillageMap({ layer, day, detailLevel = "full", focusVillageId, onVillageClick, className }: VillageMapProps) {
  const villages = (focusVillageId ? VILLAGES.filter((v) => v.id === focusVillageId) : VILLAGES).filter(isLocated);

  const bounds = useMemo(() => {
    if (villages.length === 0) {
      return { minLat: 21.48, maxLat: 21.69, minLon: 102.91, maxLon: 103.16 };
    }
    const lats = villages.map((v) => v.lat);
    const lons = villages.map((v) => v.lon);
    return {
      minLat: Math.min(...lats) - PADDING,
      maxLat: Math.max(...lats) + PADDING,
      minLon: Math.min(...lons) - PADDING,
      maxLon: Math.max(...lons) + PADDING,
    };
  }, [villages]);

  const project = (lat: number, lon: number) => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 100;
    return { x, y };
  };

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border bg-[#0A1420]", className)}>
      <svg viewBox="0 0 100 100" className="h-full min-h-[280px] w-full" role="img" aria-label="Bản đồ mức độ nguy hiểm theo bản">
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#152233" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {villages.length === 0 && (
          <text x="50" y="50" textAnchor="middle" fill="#8B9BB4" style={{ fontSize: 3.2 }}>
            Chưa có tọa độ bản đã xác minh
          </text>
        )}
        {villages.map((village) => {
          const hazard = levelForVillage(village.id, layer, day);
          const level = hazard?.level ?? 1;
          const { x, y } = project(village.lat, village.lon);
          const color = detailLevel === "full" ? HAZARD_LEVEL_COLORS[level] : tierColorForLevel(level).fill;
          const isClickable = Boolean(onVillageClick);
          return (
            <g
              key={village.id}
              transform={`translate(${x} ${y})`}
              className={isClickable ? "cursor-pointer" : undefined}
              onClick={() => onVillageClick?.(village.id)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={`${village.name}: ${detailLevel === "full" ? `cấp ${level}` : level >= 2 ? "có cảnh báo" : "an toàn"}`}
            >
              <circle r={focusVillageId ? 9 : 5.2} fill={color} stroke="#0B0E14" strokeWidth="0.8" opacity={0.92} />
              {!focusVillageId && (
                <text y={-7} textAnchor="middle" className="fill-fg" style={{ fontSize: 3.1, fontWeight: 600 }}>
                  {village.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
