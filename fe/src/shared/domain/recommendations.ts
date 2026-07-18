import type { HazardType, Occupation, Tier } from "./types";

/**
 * FR11 mock: Occupation × HazardType × Tier → (action + deadline).
 * Wording only — does not score hazard. Shared by resident role UI and reusable from /demo.
 */
export interface OccupationRecommendation {
  whatToDo: string;
  deadlineHours: number;
}

type TierCopy = Record<Tier, string>;

const DEADLINE_HOURS: Record<Tier, number> = {
  prepare: 18,
  go_now: 4,
};

const BY_OCCUPATION: Record<Occupation, Record<HazardType, TierCopy>> = {
  nong_dan: {
    flash_flood: {
      prepare: "Thu hoạch sớm phần có thể, khơi thông rãnh thoát nước quanh nhà; không ra gần suối.",
      go_now: "Dừng mọi việc đồng áng, đưa cả nhà tới điểm tập kết an toàn của bản.",
    },
    landslide: {
      prepare: "Theo dõi vết nứt/nghiêng quanh nhà và nương dốc; chuẩn bị phương án di chuyển.",
      go_now: "Rời khu vực dốc/taluy NGAY, đưa cả nhà tới điểm tập kết an toàn của bản.",
    },
  },
  chan_nuoi: {
    flash_flood: {
      prepare: "Lùa gia súc về chuồng cao ráo, dự trữ thức ăn; tránh khu vực gần suối.",
      go_now: "Thả gia súc lên đồi cao nếu còn kịp; ưu tiên đưa người rời đi trước.",
    },
    landslide: {
      prepare: "Đưa gia súc khỏi sườn dốc nguy hiểm; kiểm tra chuồng có dấu hiệu sạt.",
      go_now: "Bỏ chuồng nếu đang sát taluy; đưa người và gia súc tới điểm tập kết.",
    },
  },
  tai_xe: {
    flash_flood: {
      prepare: "Không đi đèo/suối vào ban đêm; chuẩn bị lộ trình thay thế.",
      go_now: "Dừng xe, không qua ngầm/suối; đưa người tới điểm tập kết của bản.",
    },
    landslide: {
      prepare: "Tránh đoạn đường sát taluy; theo dõi bản tin trước khi xuất phát.",
      go_now: "Không đi qua đoạn sạt; đưa người tới điểm tập kết an toàn.",
    },
  },
  giao_vien: {
    flash_flood: {
      prepare: "Thông báo phụ huynh; chuẩn bị phương án cho học sinh không qua suối.",
      go_now: "Giữ học sinh tại điểm an toàn; không để tự ý về nhà qua vùng nguy hiểm.",
    },
    landslide: {
      prepare: "Rà soát đường đến trường gần taluy; chuẩn bị điểm trú tạm.",
      go_now: "Đưa học sinh tới điểm tập kết; báo trưởng bản nếu cần hỗ trợ.",
    },
  },
  khong_co: {
    flash_flood: {
      prepare: "Theo dõi cảnh báo, nhờ hàng xóm/trưởng bản nếu cần hỗ trợ.",
      go_now: "Di chuyển ngay tới điểm tập kết; báo trưởng bản nếu cần giúp đỡ.",
    },
    landslide: {
      prepare: "Theo dõi nhà cửa và mái dốc quanh nhà; sẵn sàng di chuyển.",
      go_now: "Rời khu vực nguy hiểm ngay tới điểm tập kết của bản.",
    },
  },
};

const FALLBACK: Record<HazardType, TierCopy> = {
  flash_flood: {
    prepare: "Theo dõi cảnh báo lũ quét, chuẩn bị sẵn sàng di dời.",
    go_now: "Di dời ngay đến điểm cao an toàn theo hướng dẫn của bản.",
  },
  landslide: {
    prepare: "Theo dõi cảnh báo sạt lở, chuẩn bị sẵn sàng di dời.",
    go_now: "Di dời ngay đến điểm cao an toàn theo hướng dẫn của bản.",
  },
};

export function getOccupationRecommendation(
  occupation: Occupation,
  hazardType: HazardType,
  tier: Tier,
): OccupationRecommendation {
  const copy = BY_OCCUPATION[occupation]?.[hazardType] ?? FALLBACK[hazardType];
  return {
    whatToDo: copy[tier],
    deadlineHours: DEADLINE_HOURS[tier],
  };
}
