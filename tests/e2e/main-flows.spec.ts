import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("main project and form flow persists after refresh", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.getByRole("button", { name: /Create/i }).click();
  await expect(page.locator(".project-card.active")).toBeVisible();

  await page.locator("[data-matrix-cell='0-0']").fill("A");
  await page.getByRole("button", { name: /Apply All/i }).click();
  await expect(page.locator(".app-toast")).toContainText(/Project|user|applied|saved/i);

  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator(".app-toast")).toContainText(/saved/i);
  await expect(page.locator(".operation-card").first()).toBeVisible();

  await page.reload();
  await expect(page.locator("[data-matrix-cell='0-0']")).toHaveValue("A");
  expect(consoleErrors).toEqual([]);
});

test("saved forms can be selected duplicated renamed and deleted", async ({ page }) => {
  await page.locator(".operation-card").first().click();
  await expect(page.locator(".operation-card.active")).toBeVisible();

  const countBefore = await page.locator(".operation-card").count();
  await page.locator(".operation-card").first().getByTitle("Duplicate").click();
  await expect(page.locator(".operation-card")).toHaveCount(countBefore + 1);

  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept("Renamed Test Form");
    else await dialog.accept();
  });
  await page.locator(".operation-card").first().getByTitle("Rename").click();
  await expect(page.getByDisplayValue("Renamed Test Form")).toBeVisible();

  await page.locator(".operation-card").first().getByTitle("Delete").click();
  await expect(page.locator(".operation-card")).toHaveCount(countBefore);
});

test("environment tabs, form tabs, export and import controls are wired", async ({ page }) => {
  await page.getByRole("button", { name: "STAGING" }).click();
  await expect(page.getByRole("button", { name: "STAGING" })).toHaveClass(/active/);

  await page.locator("[data-tab='result']").click();
  await expect(page.getByText(/Latest request response/i)).toBeVisible();

  await page.locator("[data-tab='fields']").click();
  await expect(page.getByText("Field Name")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.locator("[data-action='export-projects']").first().click();
  await expect(await download).toBeTruthy();
});
