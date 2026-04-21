const { test, expect } = require("@playwright/test");

const API_BASE = process.env.E2E_API_BASE || "http://127.0.0.1:8011";
const PRIMARY_ADMIN_USERNAME = "madao";
const PRIMARY_ADMIN_PASSWORD = "666666";
const ADMIN_VIEWS = ["accounts", "dashboard", "pending", "onsite", "history", "logs"];
const ROLE_CASES = [
  {
    role: "madao2",
    defaultView: "pending",
    allowedViews: ["accounts", "dashboard", "pending", "history"],
    disallowedView: "onsite",
  },
  {
    role: "madao3",
    defaultView: "onsite",
    allowedViews: ["accounts", "onsite"],
    disallowedView: "dashboard",
  },
  {
    role: "madao4",
    defaultView: "logs",
    allowedViews: ["accounts", "dashboard", "history", "logs"],
    disallowedView: "pending",
  },
];

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function uniquePhone() {
  return `139${uniqueSuffix().slice(-8)}`;
}

function uniqueUsername(role) {
  return `${role}_${uniqueSuffix().slice(-10)}`;
}

async function waitForBackendReady(apiRequest, attempts = 10, intervalMs = 1000) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const health = await apiRequest.get(`${API_BASE}/health`);
      if (health.status() === 200) {
        return;
      }
    } catch (_) {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Backend is not ready at /health.");
}

async function openProtectedAdminPage(page, hash = "") {
  await page.goto(`/admin.html${hash}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin-login\.html/);
  await page.locator("#login-form").waitFor({ state: "visible", timeout: 10_000 });
}

async function loginByPassword(apiRequest, username, password) {
  const response = await apiRequest.post(`${API_BASE}/api/v1/auth/login`, {
    data: { username, password },
  });
  if (response.status() !== 200) {
    return null;
  }
  return response.json();
}

async function ensurePrimaryAdmin(apiRequest) {
  const payload = await loginByPassword(apiRequest, PRIMARY_ADMIN_USERNAME, PRIMARY_ADMIN_PASSWORD);
  if (!payload) {
    throw new Error("Cannot login with the primary admin account.");
  }

  return {
    username: PRIMARY_ADMIN_USERNAME,
    password: PRIMARY_ADMIN_PASSWORD,
    token: payload.access_token,
    headers: { Authorization: `Bearer ${payload.access_token}` },
  };
}

async function loginAdminUi(page, credentials) {
  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('#login-form button[type="submit"]');

  await expect.poll(async () => new URL(page.url()).pathname).toBe("/admin.html");
  await expect
    .poll(async () =>
      page.evaluate(() => Boolean(window.VisitorRuntime?.getService?.("adminSession")?.getToken?.())),
    )
    .toBe(true);
}

async function createRoleUser(apiRequest, adminHeaders, role) {
  const username = uniqueUsername(role);
  const password = `Role${role}123!`;
  const response = await apiRequest.post(`${API_BASE}/api/v1/auth/users`, {
    headers: adminHeaders,
    data: {
      username,
      password,
      role,
      is_active: true,
      force_password_change: false,
    },
  });
  expect(response.status()).toBe(201);
  return { username, password, role };
}

async function createAppointment(apiRequest, overrides = {}) {
  const now = new Date();
  now.setHours(now.getHours() + 2);
  now.setMinutes(now.getMinutes() + 5);

  const phone = overrides.phone || uniquePhone();
  const payload = {
    name: "Regression Visitor",
    phone,
    reason: "Regression Test Flow",
    target_person: "Admin",
    appointment_time: now.toISOString(),
    ...overrides,
  };

  const response = await apiRequest.post(`${API_BASE}/api/v1/apply`, { data: payload });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return {
    phone: payload.phone,
    applicationId: body.application_id,
    accessCode: body.access_code,
  };
}

async function approveAppointment(apiRequest, headers, recordId, remark = "regression approve") {
  const response = await apiRequest.put(`${API_BASE}/api/v1/admin/approve/${recordId}`, {
    headers,
    data: { action: "approve", remark },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

async function checkInAppointment(apiRequest, headers, accessCode) {
  const response = await apiRequest.post(`${API_BASE}/api/v1/admin/check-in`, {
    headers,
    data: { access_code: accessCode },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

async function getAdminStats(apiRequest, headers) {
  const response = await apiRequest.get(`${API_BASE}/api/v1/admin/stats`, { headers });
  expect(response.status()).toBe(200);
  return response.json();
}

async function getAdminOverview(apiRequest, headers) {
  const response = await apiRequest.get(`${API_BASE}/api/v1/admin/overview`, { headers });
  expect(response.status()).toBe(200);
  return response.json();
}

async function readNumericMetric(page, selector) {
  const rawText = (await page.locator(selector).innerText()).trim();
  const value = Number(rawText);
  if (!Number.isFinite(value)) {
    throw new Error(`Metric ${selector} does not contain a number: ${rawText}`);
  }
  return value;
}

test.describe("web regressions", () => {
  test("admin login page recovers accidental native form submission", async ({ page, request }) => {
    await waitForBackendReady(request);

    await page.goto("/admin-login.html?username=madao&password=666666", { waitUntil: "domcontentloaded" });

    await expect.poll(async () => new URL(page.url()).search).toBe("");
    await expect(page.locator('input[name="username"]')).toHaveValue("madao");
    await expect(page.locator('input[name="password"]')).toHaveValue("666666");
    await expect(page.locator("#login-result")).toContainText("恢复");
  });

  test("admin 401 recovery clears runtime session and returns to login page", async ({ page, request }) => {
    await waitForBackendReady(request);
    const admin = await ensurePrimaryAdmin(request);

    await openProtectedAdminPage(page, "#pending");
    await loginAdminUi(page, admin);

    await expect.poll(async () => new URL(page.url()).hash).toBe("#pending");
    await expect(page.locator('[data-view="pending"]')).toBeVisible();

    await page.evaluate(() => {
      window.VisitorRuntime.getService("adminSession").setToken("invalid-token");
    });
    await page.click("#refresh-admin-button");

    await expect(page).toHaveURL(/\/admin-login\.html/);
    await expect(page.locator("#login-form")).toBeVisible();
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("visitor_admin_token") || ""))
      .toBe("");
    await expect(page.locator("#login-result")).toContainText("登录");
    await expect
      .poll(async () => new URL(page.url()).searchParams.get("next"))
      .toBe("/admin.html#pending");
  });

  for (const roleCase of ROLE_CASES) {
    test(`role gating keeps ${roleCase.role} inside allowed views`, async ({ page, request }) => {
      await waitForBackendReady(request);
      const admin = await ensurePrimaryAdmin(request);
      const roleUser = await createRoleUser(request, admin.headers, roleCase.role);

      await openProtectedAdminPage(page);
      await loginAdminUi(page, roleUser);

      await expect.poll(async () => new URL(page.url()).hash).toBe(`#${roleCase.defaultView}`);
      await expect(page.locator(`[data-view="${roleCase.defaultView}"]`)).toBeVisible();

      for (const view of ADMIN_VIEWS) {
        const link = page.locator(`[data-view-link="${view}"]`);
        if (roleCase.allowedViews.includes(view)) {
          await expect(link).toBeVisible();
          await expect(link).not.toHaveClass(/hidden/);
          await expect(link).toHaveAttribute("aria-hidden", "false");
        } else {
          await expect(link).toHaveClass(/hidden/);
          await expect(link).toHaveAttribute("aria-hidden", "true");
        }
      }

      await page.evaluate((disallowedView) => {
        window.location.hash = `#${disallowedView}`;
      }, roleCase.disallowedView);

      await expect.poll(async () => new URL(page.url()).hash).toBe(`#${roleCase.defaultView}`);
      await expect(page.locator(`[data-view="${roleCase.defaultView}"]`)).toBeVisible();
    });
  }

  test("checked_in metrics and history filter stay aligned", async ({ page, request }) => {
    await waitForBackendReady(request);
    const admin = await ensurePrimaryAdmin(request);
    const baselineStats = await getAdminStats(request, admin.headers);
    const baselineOverview = await getAdminOverview(request, admin.headers);
    const appointment = await createAppointment(request);

    await approveAppointment(request, admin.headers, appointment.applicationId);
    await checkInAppointment(request, admin.headers, appointment.accessCode);

    await openProtectedAdminPage(page, "#dashboard");
    await loginAdminUi(page, admin);

    await page.click("#refresh-stats-button");
    await page.click("#refresh-overview-button");

    await expect
      .poll(async () => readNumericMetric(page, "#stats-checked-in"))
      .toBe(baselineStats.checked_in + 1);
    await expect
      .poll(async () => readNumericMetric(page, "#today-checked-in"))
      .toBe(baselineOverview.today.checked_in + 1);

    await page.click('[data-view-link="history"]');
    await page.selectOption('select[name="history_status"]', "checked_in");
    await page.fill('input[name="history_phone"]', appointment.phone);
    await page.click('#history-form button[type="submit"]');

    const historyItems = page.locator("#history-list .pending-item");
    await expect(historyItems).toHaveCount(1);
    await expect(historyItems.first()).toContainText(appointment.phone);
    await expect(historyItems.first()).toContainText(appointment.accessCode);
  });

  test("commander can create update and delete admin users from accounts view", async ({ page, request }) => {
    await waitForBackendReady(request);
    const admin = await ensurePrimaryAdmin(request);
    const username = uniqueUsername("ops");
    const renamedUsername = `${username}_v2`;

    await openProtectedAdminPage(page, "#accounts");
    await loginAdminUi(page, admin);

    await page.fill('input[name="new_username"]', username);
    await page.fill('input[name="new_user_password"]', "RoleTemp123!");
    await page.selectOption('select[name="new_user_role"]', "madao4");
    await page.click('#create-user-form button[type="submit"]');

    await expect(page.locator("#users-list")).toContainText(username);

    const userCard = page.locator("#users-list .pending-item", { hasText: username }).first();
    await userCard.locator("button", { hasText: "编辑" }).click();

    await page.fill('input[name="edit_username"]', renamedUsername);
    await page.fill('input[name="edit_password"]', "RoleTemp456!");
    await page.selectOption('select[name="edit_role"]', "madao2");
    await page.selectOption('select[name="edit_user_force_password_change"]', "true");
    await page.click('#edit-user-form button[type="submit"]');

    await expect(page.locator("#users-list")).toContainText(renamedUsername);
    await expect(page.locator("#users-list")).toContainText("madao2");

    const updatedLogin = await loginByPassword(request, renamedUsername, "RoleTemp456!");
    expect(updatedLogin).not.toBeNull();
    expect(updatedLogin.role).toBe("madao2");
    expect(updatedLogin.force_password_change).toBe(true);

    page.once("dialog", (dialog) => dialog.accept());
    const updatedCard = page.locator("#users-list .pending-item", { hasText: renamedUsername }).first();
    await updatedCard.locator("button", { hasText: "删除" }).click();

    await expect(page.locator("#users-list")).not.toContainText(renamedUsername);
  });
});
