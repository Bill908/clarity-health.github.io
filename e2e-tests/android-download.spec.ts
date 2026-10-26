import { test, expect } from "@playwright/test";

test("visitor can open the Android app artifact workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Take clarity with you." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get Android app" })).toHaveAttribute(
    "href",
    "https://github.com/Bill908/clarity-health.github.io/actions/workflows/android-apk.yml",
  );
});
