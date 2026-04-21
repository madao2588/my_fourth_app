(function registerVisitorApi(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }

  const adminSession = {
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
      const token = adminSession.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  function emitAuthExpired(message) {
    global.dispatchEvent(
      new CustomEvent("visitor:auth-expired", {
        detail: { message },
      }),
    );
  }

  async function parseResponse(response, options = {}) {
    if (response.ok) {
      return response.json();
    }

    const { useAuth = false } = options;
    let detail = `请求失败（HTTP ${response.status}）`;

    try {
      const payload = await response.json();
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch (_) {
      // Ignore invalid JSON error and fall back to status code.
    }

    const error = new Error(detail);
    error.status = response.status;
    error.authExpired = Boolean(useAuth && response.status === 401);

    if (error.authExpired) {
      adminSession.clearToken();
      emitAuthExpired(detail);
    }

    throw error;
  }

  async function requestJson(path, options = {}) {
    const {
      method = "GET",
      payload,
      filters,
      useAuth = false,
    } = options;

    const search = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          search.set(key, value);
        }
      });
    }

    const query = search.toString();
    const response = await global.fetch(
      `${global.APP_CONFIG.apiBaseUrl}${path}${query ? `?${query}` : ""}`,
      {
        method,
        headers: buildHeaders(
          payload
            ? {
                "Content-Type": "application/json",
              }
            : {},
          useAuth,
        ),
        body: payload ? JSON.stringify(payload) : undefined,
      },
    );

    return parseResponse(response, { useAuth });
  }

  const visitorApi = {
    healthCheck() {
      return requestJson("/health");
    },

    applyVisit(payload) {
      return requestJson("/api/v1/apply", {
        method: "POST",
        payload,
      });
    },

    queryByPhone(phone) {
      return requestJson(`/api/v1/query/${encodeURIComponent(phone)}`);
    },

    login(payload) {
      return requestJson("/api/v1/auth/login", {
        method: "POST",
        payload,
      });
    },

    getCurrentAdmin() {
      return requestJson("/api/v1/auth/me", {
        useAuth: true,
      });
    },

    changePassword(payload) {
      return requestJson("/api/v1/auth/change-password", {
        method: "POST",
        payload,
        useAuth: true,
      });
    },

    getAdminUsers() {
      return requestJson("/api/v1/auth/users", {
        useAuth: true,
      });
    },

    createAdminUser(payload) {
      return requestJson("/api/v1/auth/users", {
        method: "POST",
        payload,
        useAuth: true,
      });
    },

    updateAdminUser(userId, payload) {
      return requestJson(`/api/v1/auth/users/${userId}`, {
        method: "PATCH",
        payload,
        useAuth: true,
      });
    },

    updateAdminUserStatus(userId, payload) {
      return requestJson(`/api/v1/auth/users/${userId}/status`, {
        method: "PATCH",
        payload,
        useAuth: true,
      });
    },

    deleteAdminUser(userId) {
      return requestJson(`/api/v1/auth/users/${userId}`, {
        method: "DELETE",
        useAuth: true,
      });
    },

    getPendingAppointments() {
      return requestJson("/api/v1/admin/pending", {
        useAuth: true,
      });
    },

    getAdminStats() {
      return requestJson("/api/v1/admin/stats", {
        useAuth: true,
      });
    },

    getAdminOverview() {
      return requestJson("/api/v1/admin/overview", {
        useAuth: true,
      });
    },

    getAdminLogs(filters = {}) {
      return requestJson("/api/v1/admin/logs", {
        filters,
        useAuth: true,
      });
    },

    getAdminHistory(filters = {}) {
      return requestJson("/api/v1/admin/list", {
        filters,
        useAuth: true,
      });
    },

    auditAppointment(recordId, payload) {
      return requestJson(`/api/v1/admin/approve/${recordId}`, {
        method: "PUT",
        payload,
        useAuth: true,
      });
    },

    checkInAppointment(accessCode) {
      return requestJson("/api/v1/admin/check-in", {
        method: "POST",
        payload: { access_code: accessCode },
        useAuth: true,
      });
    },

    inspectAppointment(accessCode) {
      return requestJson("/api/v1/admin/inspect", {
        method: "POST",
        payload: { access_code: accessCode },
        useAuth: true,
      });
    },

    expireAppointment(accessCode) {
      return requestJson("/api/v1/admin/expire", {
        method: "POST",
        payload: { access_code: accessCode },
        useAuth: true,
      });
    },

    expireStaleAppointments() {
      return requestJson("/api/v1/admin/expire-stale", {
        method: "POST",
        useAuth: true,
      });
    },
  };

  runtime.setService("adminSession", adminSession);
  runtime.setService("visitorApi", visitorApi);
})(window);
