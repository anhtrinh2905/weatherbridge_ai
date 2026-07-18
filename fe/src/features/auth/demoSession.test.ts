import { afterEach, expect, test } from "vitest";
import { clearDemoSession, readDemoSession, saveDemoSession } from "./demoSession";

afterEach(clearDemoSession);

test("restores demo tokens from session storage after a page reload", () => {
  const tokens = { accessToken: "access", refreshToken: "refresh", idToken: "id" };
  saveDemoSession(tokens);
  expect(readDemoSession()).toEqual(tokens);
});

test("ignores a malformed stored demo session", () => {
  sessionStorage.setItem("weather-bridge.demo-session", "not-json");
  expect(readDemoSession()).toBeNull();
});
