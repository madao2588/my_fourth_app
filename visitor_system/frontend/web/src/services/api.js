window.adminSession = {
  getToken() {
    return localStorage.getItem("visitor_admin_token") || "";
  },

  setToken(token) {
    localStorage.setItem("visitor_admin_token", token);
  },

  clearToken() {
    localStorage.removeItem("visitor_admin_token");
  },
};

function buildHeaders(extraHeaders = {}, useAuth = false) {
  const headers = { ...extraHeaders };

  if (useAuth) {
    const token = window.adminSession.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function parseResponse(response) {
  if (response.ok) {
    return response.json();
  }

  let detail = `HTTP ${response.status}`;

  try {
    const payload = await response.json();
    if (payload.detail) {
      detail = payload.detail;
    }
  } catch (error) {
    // Ignore invalid JSON error and fall back to status code.
  }

  throw new Error(detail);
}

window.visitorApi = {
  async healthCheck() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/health`);
    return parseResponse(response);
  },

  async applyVisit(payload) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/apply`, {
      method: "POST",
      headers: buildHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  },

  async queryByPhone(phone) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/query/${encodeURIComponent(phone)}`);
    return parseResponse(response);
  },

  async login(payload) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: buildHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  },

  async getCurrentAdmin() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/auth/me`, {
      headers: buildHeaders({}, true),
    });

    return parseResponse(response);
  },

  async changePassword(payload) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/auth/change-password`, {
      method: "POST",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  },

  async getAdminUsers() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/auth/users`, {
      headers: buildHeaders({}, true),
    });

    return parseResponse(response);
  },

  async createAdminUser(payload) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/auth/users`, {
      method: "POST",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  },

  async updateAdminUserStatus(userId, payload) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/auth/users/${userId}/status`, {
      method: "PATCH",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  },

  async getPendingAppointments() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/pending`, {
      headers: buildHeaders({}, true),
    });

    return parseResponse(response);
  },

  async getAdminStats() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/stats`, {
      headers: buildHeaders({}, true),
    });

    return parseResponse(response);
  },

  async getAdminOverview() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/overview`, {
      headers: buildHeaders({}, true),
    });

    return parseResponse(response);
  },

  async getAdminLogs(filters = {}) {
    const search = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });

    const query = search.toString();
    const response = await fetch(
      `${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/logs${query ? `?${query}` : ""}`,
      {
        headers: buildHeaders({}, true),
      },
    );

    return parseResponse(response);
  },

  async getAdminHistory(filters = {}) {
    const search = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });

    const query = search.toString();
    const response = await fetch(
      `${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/list${query ? `?${query}` : ""}`,
      {
        headers: buildHeaders({}, true),
      },
    );

    return parseResponse(response);
  },

  async auditAppointment(recordId, payload) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/approve/${recordId}`, {
      method: "PUT",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify(payload),
    });

    return parseResponse(response);
  },

  async checkInAppointment(accessCode) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/check-in`, {
      method: "POST",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify({ access_code: accessCode }),
    });

    return parseResponse(response);
  },

  async inspectAppointment(accessCode) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/inspect`, {
      method: "POST",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify({ access_code: accessCode }),
    });

    return parseResponse(response);
  },

  async expireAppointment(accessCode) {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/expire`, {
      method: "POST",
      headers: buildHeaders(
        {
          "Content-Type": "application/json",
        },
        true,
      ),
      body: JSON.stringify({ access_code: accessCode }),
    });

    return parseResponse(response);
  },

  async expireStaleAppointments() {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/api/v1/admin/expire-stale`, {
      method: "POST",
      headers: buildHeaders({}, true),
    });

    return parseResponse(response);
  },
};
