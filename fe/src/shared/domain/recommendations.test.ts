import { expect, test } from "vitest";
import { getOccupationRecommendation } from "./recommendations";

test("nông dân × flash_flood × go_now returns farm stop-and-evacuate action", () => {
  const rec = getOccupationRecommendation("nong_dan", "flash_flood", "go_now");
  expect(rec.whatToDo).toMatch(/đồng áng/i);
  expect(rec.whatToDo).toMatch(/điểm tập kết/i);
  expect(rec.deadlineHours).toBe(4);
});

test("nông dân × landslide × prepare returns slope watch action", () => {
  const rec = getOccupationRecommendation("nong_dan", "landslide", "prepare");
  expect(rec.whatToDo).toMatch(/nứt|nghiêng|nương/i);
  expect(rec.deadlineHours).toBe(18);
});
