import { test, expect } from "@playwright/test";

test("visitor can open a guided health answer", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /A clearer answer starts here\./i })).toBeVisible();
  await page.getByRole("button", { name: "See an example answer" }).click();

  await expect(page.getByRole("textbox", { name: "Your health question" })).toHaveValue("What should I ask my doctor about a new symptom?");
  await expect(page.getByText(/Do not include names, dates of birth, addresses, record numbers/i)).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Find my answer" }).click();
  await expect(page.getByText("Your Clarity answer")).toBeVisible();
});

test("follow-up selections request and display contextual guidance", async ({ page }) => {
  let followUpRequest = "";
  await page.route("**/functions/v1/answer-health", async (route) => {
    const request = route.request().postDataJSON();
    followUpRequest = request.question;
    const isFollowUp = request.question.includes("Follow-up:");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "ai",
        title: isFollowUp ? "A targeted next step" : "Sleep guidance",
        summary: isFollowUp ? "Keep a consistent wake time and track how rested you feel." : "Start with a regular sleep routine.",
        points: ["Track sleep timing.", "Keep a steady wake time.", "Discuss persistent problems with a clinician."],
        next: "Seek urgent help for severe symptoms.",
        consider: "Note how sleep affects daytime energy.",
        clinicianType: "primary-care clinician",
        followUps: [
          { question: "What can I try tonight?", answer: "" },
          { question: "When should I get checked?", answer: "" },
        ],
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "See an example answer" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Find my answer" }).click();
  await expect(page.getByRole("heading", { name: "Sleep guidance" })).toBeVisible();

  await page.getByRole("button", { name: "What can I try tonight?" }).click();

  await expect(page.getByRole("heading", { name: "A targeted next step" })).toBeVisible();
  await expect(page.getByText("Keep a consistent wake time and track how rested you feel.")).toBeVisible();
  expect(followUpRequest).toContain("What should I ask my doctor about a new symptom?");
  expect(followUpRequest).toContain("Follow-up: What can I try tonight?");
});
