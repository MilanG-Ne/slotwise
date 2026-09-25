import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("login, calendar, resource cards, and booking dialog meet automated accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Explore as member" }),
  ).toBeVisible();
  const check = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect
      .soft(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      )
      .toEqual([]);
  };
  await check();
  await page.getByRole("button", { name: "Explore as member" }).click();
  await expect(
    page.getByRole("button", { name: "Book The Glasshouse", exact: true }),
  ).toBeVisible();
  await check();
  if (process.env.UPDATE_SCREENSHOTS)
    await page.screenshot({ path: "docs/availability.png", fullPage: true });
  await page.getByRole("button", { name: "New booking", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await check();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The Glasshouse" }),
  ).toBeVisible();
  await check();
  if (process.env.UPDATE_SCREENSHOTS)
    await page.screenshot({ path: "docs/resources.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Availability", exact: true }).click();
  await expect(page.locator(".mobile-slots").first()).toBeVisible();
  await check();
  if (process.env.UPDATE_SCREENSHOTS)
    await page.screenshot({ path: "docs/mobile.png", fullPage: true });
});
