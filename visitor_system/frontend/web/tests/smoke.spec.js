const { test, expect } = require("@playwright/test");

const API_BASE = process.env.E2E_API_BASE || "http://127.0.0.1:8011";
const DEFAULT_ADMIN_USERNAME = "madao";
const DEFAULT_ADMIN_PASSWORD = "666666";
const STABLE_ADMIN_PASSWORD = "666666";

function formatDateTimeLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hour = `${d.getHours()}`.padStart(2, "0");
  const minute = `${d.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function uniquePhone() {
  const suffix = `${Date.now()}`.slice(-8);
  return `139${suffix}`;
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

async function openVisitorPage(page) {
  for (let i = 0; i < 3; i += 1) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nameInput = page.locator('input[name="name"]');
    const count = await nameInput.count();
    if (count > 0) {
      await nameInput.waitFor({ state: "visible", timeout: 10_000 });
      return;
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Root page did not resolve to the visitor interface.');
}

async function loginByPassword(apiRequest, password) {
  const response = await apiRequest.post(`${API_BASE}/api/v1/auth/login`, {
    data: { username: DEFAULT_ADMIN_USERNAME, password },
  });
  if (response.status() !== 200) {
    return null;
  }
  return response.json();
}

async function ensureAdminCredentials(apiRequest) {
  const firstTryStable = await loginByPassword(apiRequest, STABLE_ADMIN_PASSWORD);
  if (firstTryStable) {
    return { password: STABLE_ADMIN_PASSWORD, token: firstTryStable.access_token };
  }

  const firstTryDefault = await loginByPassword(apiRequest, DEFAULT_ADMIN_PASSWORD);
  if (!firstTryDefault) {
    throw new Error("Cannot login with either default or stable admin password.");
  }

  if (!firstTryDefault.force_password_change) {
    return { password: DEFAULT_ADMIN_PASSWORD, token: firstTryDefault.access_token };
  }

  const changeResponse = await apiRequest.post(`${API_BASE}/api/v1/auth/change-password`, {
    headers: { Authorization: `Bearer ${firstTryDefault.access_token}` },
    data: {
      current_password: DEFAULT_ADMIN_PASSWORD,
      new_password: STABLE_ADMIN_PASSWORD,
    },
  });
  expect(changeResponse.status()).toBe(200);

  const relogin = await loginByPassword(apiRequest, STABLE_ADMIN_PASSWORD);
  if (!relogin) {
    throw new Error("Password updated but cannot relogin with stable password.");
  }
  return { password: STABLE_ADMIN_PASSWORD, token: relogin.access_token };
}

async function createAppointment(apiRequest, overrides = {}) {
  const now = new Date();
  now.setHours(now.getHours() + 2);
  now.setMinutes(now.getMinutes() + 5);

  const phone = overrides.phone || uniquePhone();
  const payload = {
    name: "Smoke Visitor",
    phone,
    reason: "Smoke Test Flow",
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

test.describe("web smoke", () => {
  test("visitor apply and query flow", async ({ page, request }) => {
    await waitForBackendReady(request);
    const phone = uniquePhone();
    const appointmentTime = formatDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000));

    await openVisitorPage(page);
    await page.fill('input[name="name"]', "Smoke Visitor");
    await page.fill('input[name="phone"]', phone);
    await page.fill('textarea[name="reason"]', "Visitor smoke test");
    await page.fill('input[name="target_person"]', "Admin");
    await page.fill('input[name="appointment_time"]', appointmentTime);
    await page.click('#apply-form button[type="submit"]');

    await expect(page.locator("#ticket-card")).toBeVisible();
    const accessCodeText = (await page.locator("#access-code").innerText()).trim();
    expect(accessCodeText).toMatch(/^[A-Z0-9]{6}$/);

    await page.fill('input[name="query_phone"]', phone);
    await page.click('#query-form button[type="submit"]');
    await expect(page.locator("#query-card")).toBeVisible();

    const queryStatus = (await page.locator("#query-status").innerText()).trim();
    expect(queryStatus).toBe("待审批");

    const queryTime = (await page.locator("#query-time").innerText()).trim();
    expect(queryTime).toContain(appointmentTime.slice(11, 16));
  });

  test("admin approve, check-in, history and logs flow", async ({ page, request }) => {
    await waitForBackendReady(request);
    const admin = await ensureAdminCredentials(request);
    const appointment = await createAppointment(request);
    const lazyAdminDataRequests = [];

    page.on("request", (browserRequest) => {
      if (/\/api\/v1\/admin\/(pending|stats|overview|list|logs)(\?|$)/.test(browserRequest.url())) {
        lazyAdminDataRequests.push(browserRequest.url());
      }
    });

    await page.goto("/admin.html#accounts", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin-login\.html/);
    await page.fill('input[name="username"]', DEFAULT_ADMIN_USERNAME);
    await page.fill('input[name="password"]', admin.password);
    await page.click('#login-form button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\.html#accounts/);
    await expect(page.locator("#account-card")).toBeVisible();
    expect(lazyAdminDataRequests).toEqual([]);

    await page.click('[data-view-link="pending"]');
    await page.click("#refresh-admin-button");
    const pendingItem = page.locator("#pending-list .pending-item", { hasText: appointment.phone }).first();
    await expect(pendingItem).toBeVisible();
    await pendingItem.locator("textarea.remark-input").fill("smoke approve");
    await pendingItem.locator("button").first().click();

    await expect
      .poll(async () => {
        const queryAfterApprove = await request.get(`${API_BASE}/api/v1/query/${appointment.phone}`);
        if (queryAfterApprove.status() !== 200) {
          return "";
        }
        const approvedBody = await queryAfterApprove.json();
        return approvedBody.record.status;
      })
      .toBe("approved");

    await page.click('[data-view-link="onsite"]');
    await page.fill('input[name="check_in_code"]', appointment.accessCode);
    await page.click('#check-in-form button[type="submit"]');
    await expect(page.locator("#operation-result")).toBeVisible();

    await expect
      .poll(async () => {
        const queryAfterCheckIn = await request.get(`${API_BASE}/api/v1/query/${appointment.phone}`);
        if (queryAfterCheckIn.status() !== 200) {
          return "";
        }
        const checkedInBody = await queryAfterCheckIn.json();
        return checkedInBody.record.checked_in_at || "";
      })
      .not.toBe("");

    await page.click('[data-view-link="history"]');
    await page.click("#refresh-history-button");
    await expect(page.locator("#history-list .pending-item").first()).toBeVisible();

    await page.click('[data-view-link="logs"]');
    await page.click("#refresh-logs-button");
    await expect(page.locator("#logs-list .activity-item").first()).toBeVisible();

    const limitBefore = await page.locator('input[name="log_limit"]').inputValue();
    await page.click("#load-more-logs-button");
    const limitAfter = await page.locator('input[name="log_limit"]').inputValue();
    expect(Number(limitAfter)).toBeGreaterThan(Number(limitBefore));
  });
});
