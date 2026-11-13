import { test, expect } from "@playwright/test";
async function login(page, role = "admin") {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(role + "@demo.societyos.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("SocietyOS-Test-Only-2026");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/app/);
  await expect(page.locator(".pageheading")).toBeVisible();
}
test("signed-out routes stay locked and login is responsive", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/features",
    "/app/overview",
    "/app/invoices",
    "/app/platform",
    "/app/scanner",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/login/);
    await expect(
      page.getByRole("button", { name: "Sign in securely" }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Administrator", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto("/signup");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("admin dashboard and every module load without runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  for (const section of [
    "overview",
    "buildings",
    "floors",
    "units",
    "members",
    "unit_occupancies",
    "visitor_passes",
    "complaints",
    "invoices",
    "payments",
    "facilities",
    "facility_bookings",
    "announcements",
    "community_events",
    "polls",
    "documents",
    "feedback",
    "lost_found_reports",
    "security_incidents",
    "emergency_contacts",
    "shifts",
    "notifications",
    "reports",
    "audit_logs",
    "support_requests",
    "settings",
  ]) {
    await page.goto("/app/" + section);
    await expect(page.locator(".pageheading")).toBeVisible();
    await expect(page.locator(".maincontent .error")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
test("admin creates and edits a building", async ({ page }) => {
  await login(page);
  await page.goto("/app/buildings");
  await page.getByRole("button", { name: "New building", exact: true }).click();
  await page.getByLabel("name", { exact: true }).fill("Willow Court");
  await page
    .getByRole("button", { name: "Create building", exact: true })
    .click();
  await expect(page.getByText("Willow Court", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open Willow Court" }).click();
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("name", { exact: true }).fill("Willow House");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Willow House", { exact: true })).toBeVisible();
});
test("resident submits a request and generates a visitor QR", async ({
  page,
}) => {
  await login(page, "resident");
  await page.goto("/app/complaints");
  await page.getByRole("button", { name: "New request" }).click();
  await page.getByLabel("title", { exact: true }).fill("Browser test request");
  await page.getByLabel("Unit", { exact: true }).selectOption({ index: 1 });
  await page
    .getByLabel("description", { exact: true })
    .fill("Please inspect the sink.");
  await page
    .getByRole("button", { name: "Create request", exact: true })
    .click();
  await expect(
    page.getByText("Browser test request", { exact: true }),
  ).toBeVisible();
  await page.goto("/app/visitor_passes");
  await page
    .getByRole("button", { name: "New visitor pass", exact: true })
    .click();
  await page.getByLabel("name", { exact: true }).fill("Browser Guest");
  await page.getByLabel("Unit", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("purpose", { exact: true }).fill("Family visit");
  const fmt = (d) =>
    new Date(d - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  await page.getByLabel("Starts at").fill(fmt(Date.now()));
  await page.getByLabel("Ends at").fill(fmt(Date.now() + 3600000));
  await page
    .getByRole("button", { name: "Create visitor pass", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Visitor QR code" }),
  ).toBeVisible();
});
test("mobile navigation works and records stay within viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "resident");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/shown/);
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Billing & payments", exact: true })
    .click();
  await expect(page.locator(".pageheading h1")).toHaveText(
    "Clear finances, simpler collections",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("security and maintenance workspaces are separate", async ({ page }) => {
  await login(page, "guard");
  await page.goto("/app/scanner");
  await expect(
    page.getByRole("button", { name: "Check in", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".sidebar")
      .getByRole("link", { name: "Billing & payments", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "maintenance");
  await expect(
    page
      .locator(".sidebar")
      .getByRole("link", { name: "Visitors", exact: true }),
  ).toHaveCount(0);
  await page.goto("/app/complaints");
  await expect(page.getByRole("button", { name: "New request" })).toHaveCount(
    0,
  );
});
test("platform administrator overview works", async ({ page }) => {
  await login(page, "superadmin");
  await expect(
    page.getByRole("heading", { name: "Your communities at a glance" }),
  ).toBeVisible();
  await expect(
    page.getByText("Green Valley Residency", { exact: true }),
  ).toBeVisible();
});

test("settings saves and reports display real charts", async ({ page }) => {
  await login(page);
  await page.goto("/app/settings");
  await page.getByRole("heading", { name: "Your society" }).waitFor();
  await page.getByRole("button", { name: "Save", exact: true }).nth(1).click();
  await expect(page.getByRole("status")).toContainText("Society updated");
  await page.goto("/app/reports");
  await expect(
    page.getByRole("heading", { name: "Home occupancy" }),
  ).toBeVisible();
  await expect(page.locator(".maincontent .error")).toHaveCount(0);
});
test("monthly invoice generation and booking calendar work", async ({
  page,
}) => {
  await login(page);
  await page.goto("/app/invoices");
  await page
    .getByRole("button", { name: "Monthly charges", exact: true })
    .click();
  await page.getByLabel("Amount (PKR)", { exact: true }).fill("7500");
  await page
    .getByLabel("Payment due", { exact: true })
    .fill("2027-01-15T12:00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("invoices created");
  await page.goto("/app/facility_bookings");
  await page.getByRole("button", { name: "Show calendar" }).click();
  await expect(page.locator(".booking-calendar")).toBeVisible();
});

test("sign out revokes access to direct links and API data", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/app/invoices");
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get("/api/invoices")).status()).toBe(401);
});
