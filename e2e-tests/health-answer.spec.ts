import { test, expect } from "@playwright/test";

test("visitor can open a guided health answer", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /A clearer answer starts here\./i })).toBeVisible();
  await page.getByRole("button", { name: "See an example answer" }).click();

  await expect(page.getByRole("textbox", { name: "Your health question" })).toHaveValue("What should I ask my doctor about a new symptom?");
  await expect(page.getByText(/Do not include names, dates of birth, addresses, record numbers/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Find my answer" })).toBeVisible();
});
