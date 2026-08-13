import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("AWS Route53 Clone E2E Workflow", () => {
  test("1. Complete User Authentication and Session Flow", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Verify AWS styled login page
    await expect(page.locator("h1")).toContainText("Sign in");
    await expect(page.locator("text=AWS Route 53 Console")).toBeVisible();

    // Login with seeded credentials
    await page.fill('input[type="email"]', "demo@route53.example");
    await page.fill('input[type="password"]', "DemoPass123!");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or hosted zones
    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/(hosted-zones|dashboard)`));
  });

  test("2. Hosted Zone CRUD and Search", async ({ page }) => {
    // Authenticate
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "demo@route53.example");
    await page.fill('input[type="password"]', "DemoPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/hosted-zones`);

    // Create a new hosted zone
    const testDomain = `e2e-playwright-${Date.now()}.org`;
    await page.click("#create-hosted-zone-btn");
    await page.fill("#zone-name", testDomain);
    await page.fill("#zone-description", "Playwright E2E Zone");
    await page.click("#create-zone-submit");

    // Verify it appears in the table
    await expect(page.locator(`text=${testDomain}`)).toBeVisible();

    // Search for the zone
    await page.fill("#hosted-zones-search", "e2e-playwright");
    await page.click('button[type="submit"]:has-text("Search")');
    await expect(page.locator(`text=${testDomain}`)).toBeVisible();
  });

  test("3. DNS Record Creation and Filtering", async ({ page }) => {
    // Authenticate
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "demo@route53.example");
    await page.fill('input[type="password"]', "DemoPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/hosted-zones`);

    // Create a hosted zone to test records
    const zoneName = `records-test-${Date.now()}.com`;
    await page.click("#create-hosted-zone-btn");
    await page.fill("#zone-name", zoneName);
    await page.click("#create-zone-submit");

    // Click into the zone
    await page.click(`text=${zoneName}`);

    // Create A Record
    await page.click("#create-record-btn");
    await page.fill("#record-name", "api");
    await page.fill("#record-ttl", "300");
    await page.fill("#record-values", "192.0.2.1");
    await page.click("#save-record-btn");
    await expect(page.locator("text=api")).toBeVisible();

    // Filter by type
    await page.selectOption("#type-filter", "A");
    await expect(page.locator("text=api")).toBeVisible();
  });

  test("4. Navigation to Mocked Sections", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "demo@route53.example");
    await page.fill('input[type="password"]', "DemoPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/hosted-zones`);

    // Navigate to Health Checks
    await page.click('a[href="/health-checks"]');
    await expect(page.locator("text=Coming Soon")).toBeVisible();

    // Navigate to Traffic Policies
    await page.click('a[href="/traffic-policies"]');
    await expect(page.locator("text=Coming Soon")).toBeVisible();

    // Navigate to Resolver
    await page.click('a[href="/resolver"]');
    await expect(page.locator("text=Coming Soon")).toBeVisible();
  });
});
