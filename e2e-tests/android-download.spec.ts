import { test, expect } from "@playwright/test";

test("visitor can download the latest Android APK", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Take clarity with you." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download Android app" })).toHaveAttribute(
    "href",
    "https://github.com/Bill908/clarity-health.github.io/releases/latest/download/ClarityHealth.apk",
  );
});
