import { test, expect, type Page } from "@playwright/test";
import { addDays } from "../frontend/time";

async function login(page: Page, role = "member") {
  await page.goto("/");
  await page.getByRole("button", { name: `Explore as ${role}` }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for good work." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Book The Glasshouse", exact: true }),
  ).toBeVisible();
}
async function newBooking(page: Page, title: string, offset: number) {
  const date = await page.getByLabel("Schedule date").inputValue();
  await page.getByRole("button", { name: "New booking", exact: true }).click();
  await page.getByLabel("What’s the plan?").fill(title);
  await page.getByLabel("Date", { exact: true }).fill(addDays(date, offset));
  await page.getByLabel("Start time").selectOption("12:00");
  await page.getByRole("button", { name: "Confirm booking" }).click();
}

test("member books, sees persisted reservation, and cancels it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const title = `Design catch-up ${Date.now()}`;
  await newBooking(page, title, 12);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: /My bookings/ }).click();
  const row = page.getByRole("button").filter({ hasText: title });
  await expect(row).toBeVisible();
  await page.reload();
  await row.click();
  await page
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, cancel booking" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Cancelled");
  expect(errors).toEqual([]);
});

test("a conflicting reservation keeps the form open and preserves the existing booking", async ({
  page,
}) => {
  await login(page);
  const date = await page.getByLabel("Schedule date").inputValue();
  await page.getByRole("button", { name: "New booking", exact: true }).click();
  await page.getByLabel("What’s the plan?").fill("Conflicting reservation");
  await page.getByLabel("Date", { exact: true }).fill(addDays(date, 1));
  await page.getByLabel("Start time").selectOption("09:00");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "That time was just taken",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("What’s the plan?")).toHaveValue(
    "Conflicting reservation",
  );
});

test("failed optimistic cancellation restores the booking and supports retry", async ({
  page,
}) => {
  await login(page);
  const title = `Rollback check ${Date.now()}`;
  await newBooking(page, title, 13);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: /My bookings/ }).click();
  const row = page.getByRole("button").filter({ hasText: title });
  await row.click();
  await page.route("**/api/bookings/*", async (route) => {
    if (route.request().method() === "DELETE")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Temporarily unavailable." }),
      });
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, cancel booking" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await expect(row).toContainText("Confirmed");
  await page.unroute("**/api/bookings/*");
  await page.getByRole("button", { name: "Yes, cancel booking" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Cancelled");
});

test("keyboard dialog focus, filters, and logout work", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Studios", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Book Studio 03", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Book The Glasshouse", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "New booking", exact: true }).click();
  await expect(page.getByLabel("What’s the plan?")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "New booking", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Explore as member" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Explore as member" }),
  ).toBeVisible();
});

test("admin creates and pauses a resource, with text safely rendered", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "Manage resources" }).click();
  await page.getByRole("button", { name: "Add resource" }).click();
  const title = `<img src=x onerror=alert(1)> ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(title);
  await page.getByLabel("Location").fill("Second floor");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A temporary resource for the browser test.");
  await page.getByRole("button", { name: "Save resource" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card.getByRole("heading")).toHaveText(title);
  await expect(card.locator("img")).toHaveCount(0);
  await card.getByRole("button", { name: "Edit resource" }).click();
  await page.getByLabel("Available for new bookings").uncheck();
  await page.getByRole("button", { name: "Save resource" }).click();
  await expect(card).toContainText("Paused");
});

test("mobile has a readable schedule without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".mobile-slots").first()).toBeVisible();
  await page.getByRole("button", { name: "New booking", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The Glasshouse" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("HTTP boundary rejects missing CSRF and member administration", async ({
  request,
}) => {
  const session = await (await request.get("/api/session")).json();
  const noCsrf = await request.post("/api/login", {
    data: { email: "alex@example.test", password: "demo-password" },
  });
  expect(noCsrf.status()).toBe(419);
  const login = await request.post("/api/login", {
    headers: { "X-CSRF-TOKEN": session.csrf_token },
    data: { email: "alex@example.test", password: "demo-password" },
  });
  expect(login.status()).toBe(200);
  const signedIn = await login.json();
  const forbidden = await request.post("/api/resources", {
    headers: {
      Accept: "application/json",
      "X-CSRF-TOKEN": signedIn.csrf_token,
    },
    data: {},
  });
  expect(forbidden.status()).toBe(403);
});
