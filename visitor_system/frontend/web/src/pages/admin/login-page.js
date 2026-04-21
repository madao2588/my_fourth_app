(function registerAdminLoginPage(global) {
  const loginForm = global.document.getElementById("login-form");
  const loginResultNode = global.document.getElementById("login-result");
  const submitButton = global.document.getElementById("login-submit-button");
  const usernameInput = loginForm?.elements?.namedItem("username") || null;
  const passwordInput = loginForm?.elements?.namedItem("password") || null;
  const fallbackAdminUrl = new URL("./admin.html", global.location.href);
  const fallbackAdminPath = fallbackAdminUrl.pathname;
  const postLoginTargetStorageKey = "visitor_admin_next_target";
  let isSubmitting = false;

  function setMessage(text) {
    if (global.VisitorShared?.setText) {
      global.VisitorShared.setText(loginResultNode, text);
      return;
    }
    if (loginResultNode) {
      loginResultNode.textContent = text;
    }
  }

  function setSubmittingState(nextState) {
    isSubmitting = Boolean(nextState);
    if (!submitButton) {
      return;
    }
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "登录中..." : "登录";
  }

  function normalizeAdminTarget(value) {
    if (!value) {
      return fallbackAdminPath;
    }

    try {
      const url = new URL(value, global.location.origin);
      if (url.origin !== global.location.origin) {
        return fallbackAdminPath;
      }
      if (url.pathname !== fallbackAdminPath) {
        return fallbackAdminPath;
      }
      return `${url.pathname}${url.hash || ""}`;
    } catch (_) {
      return fallbackAdminPath;
    }
  }

  function getRequestedAdminTarget() {
    const url = new URL(global.location.href);
    return normalizeAdminTarget(url.searchParams.get("next"));
  }

  function redirectToAdmin(targetPath) {
    global.location.replace(normalizeAdminTarget(targetPath));
  }

  function consumeLoginMessage() {
    const url = new URL(global.location.href);
    const message = url.searchParams.get("message") || "";
    url.searchParams.delete("message");
    if (url.search !== global.location.search) {
      global.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    return message;
  }

  function recoverNativeFormQuery() {
    const url = new URL(global.location.href);
    const username = url.searchParams.get("username") || "";
    const password = url.searchParams.get("password") || "";
    const recovered = Boolean(username || password);

    if (recovered) {
      if (usernameInput && !usernameInput.value) {
        usernameInput.value = username;
      }
      if (passwordInput && !passwordInput.value) {
        passwordInput.value = password;
      }
      url.searchParams.delete("username");
      url.searchParams.delete("password");
      global.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    return recovered;
  }

  async function handleLoginSubmit(event) {
    event?.preventDefault?.();
    if (isSubmitting || !loginForm) {
      return;
    }

    const runtime = global.VisitorRuntime;
    const visitorApi = runtime?.getService?.("visitorApi");
    const adminSession = runtime?.getService?.("adminSession");
    if (!runtime || !visitorApi || !adminSession) {
      setMessage("登录页初始化失败，请刷新后重试。");
      return;
    }

    const formData = new FormData(loginForm);
    const payload = {
      username: formData.get("username"),
      password: formData.get("password"),
    };

    setSubmittingState(true);
    setMessage("正在验证管理员身份...");

    try {
      const result = await visitorApi.login(payload);
      const requestedTarget = getRequestedAdminTarget();
      adminSession.setToken(result.access_token);
      if (result.force_password_change) {
        global.sessionStorage.removeItem(postLoginTargetStorageKey);
        redirectToAdmin(`${fallbackAdminPath}#accounts`);
        return;
      }
      global.sessionStorage.setItem(postLoginTargetStorageKey, requestedTarget);
      redirectToAdmin(requestedTarget);
    } catch (error) {
      setMessage(`登录失败：${error.message}`);
      setSubmittingState(false);
    }
  }

  const recoveredNativeQuery = recoverNativeFormQuery();
  const initialMessage = consumeLoginMessage();

  if (!global.VisitorRuntime || typeof global.VisitorRuntime.getService !== "function") {
    if (recoveredNativeQuery) {
      setMessage("检测到浏览器刚才执行了普通表单提交，已恢复输入，请重新点击登录。");
    } else if (initialMessage) {
      setMessage(initialMessage);
    } else {
      setMessage("登录页初始化失败，请刷新后重试。");
    }
    loginForm?.addEventListener("submit", handleLoginSubmit);
    return;
  }

  const adminSession = global.VisitorRuntime.getService("adminSession");
  if (adminSession?.getToken()) {
    redirectToAdmin(getRequestedAdminTarget());
  } else if (recoveredNativeQuery) {
    setMessage("检测到浏览器刚才执行了普通表单提交，已恢复输入，请重新点击登录。");
  } else if (initialMessage) {
    setMessage(initialMessage);
  }

  loginForm?.addEventListener("submit", handleLoginSubmit);
})(window);
