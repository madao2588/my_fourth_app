const {
  byId,
  setText,
  toggleHidden,
  clearNode,
  clearValue,
  formatStatus,
  formatDateTime,
  normalizeDateTimeInput,
  normalizeAccessCode,
} = window.VisitorShared;

if (!window.VisitorRuntime) {
  throw new Error("VisitorRuntime is not available.");
}
if (typeof window.VisitorRuntime.getService !== "function") {
  throw new Error("VisitorRuntime.getService is not available.");
}
if (typeof window.createWebDomElements !== "function") {
  throw new Error("createWebDomElements is not available.");
}
if (typeof window.createVisitorAppState !== "function") {
  throw new Error("createVisitorAppState is not available.");
}

const runtime = window.VisitorRuntime;
const adminSession = runtime.getService("adminSession");
const visitorApi = runtime.getService("visitorApi");
if (!adminSession || !visitorApi) {
  throw new Error("Runtime services are not available.");
}

const adminState = window.createVisitorAppState();
const el = window.createWebDomElements(byId);
const services = { adminSession, visitorApi };

const HISTORY_PAGE_SIZE = 5;
const ADMIN_MODULE_KEYS = ["accounts", "dashboard", "pending", "onsite", "history", "logs"];
const ADMIN_BEHAVIOR_KEYS = ["shell", ...ADMIN_MODULE_KEYS];
const VISITOR_BEHAVIOR_KEYS = ["home", "pass", "apply", "query"];
const ADMIN_PAGE_URL = new URL("./admin.html", window.location.href);
const ADMIN_LOGIN_URL = new URL("./admin-login.html", window.location.href);
const ADMIN_PAGE_PATH = ADMIN_PAGE_URL.pathname;

const getCheckInCodeInput = () => el.checkInForm?.elements?.namedItem("check_in_code") || null;
const getExpireCodeInput = () => el.expireForm?.elements?.namedItem("expire_code") || null;
const isAdminLoggedIn = () => Boolean(adminSession.getToken());
const isAuthExpiredError = (error) => Boolean(error?.authExpired);
const setScannerMessage = (text) => setText(el.scannerResultNode, text);

function normalizeAdminTarget(value) {
  if (!value) {
    return ADMIN_PAGE_PATH;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) {
      return ADMIN_PAGE_PATH;
    }
    if (url.pathname !== ADMIN_PAGE_PATH) {
      return ADMIN_PAGE_PATH;
    }
    return `${url.pathname}${url.hash || ""}`;
  } catch (_) {
    return ADMIN_PAGE_PATH;
  }
}

function buildAdminLoginUrl(message = "", nextTarget = `${window.location.pathname}${window.location.hash || ""}`) {
  const loginUrl = new URL(ADMIN_LOGIN_URL.href);
  const normalizedNextTarget = normalizeAdminTarget(nextTarget);

  if (normalizedNextTarget) {
    loginUrl.searchParams.set("next", normalizedNextTarget);
  }
  if (message) {
    loginUrl.searchParams.set("message", message);
  }

  return loginUrl;
}

function redirectToAdminLogin(message = "", options = {}) {
  const { nextTarget, replace = true } = options;
  const targetUrl = buildAdminLoginUrl(message, nextTarget);
  if (replace) {
    window.location.replace(targetUrl.toString());
    return;
  }
  window.location.assign(targetUrl.toString());
}

function resolveRegistryEntry(factory, context) {
  return typeof factory === "function" ? factory(context) : null;
}

function createRegistryMap(registry, keys, context) {
  return Object.fromEntries(keys.map((key) => [key, resolveRegistryEntry(registry[key], context)]));
}

function initAdminModules() {
  const registry = runtime.getRegistry("adminPages");
  const moduleContext = { byId, elements: el };
  const modules = [];

  ADMIN_MODULE_KEYS.forEach((key) => {
    const module = resolveRegistryEntry(registry[key], moduleContext);
    if (module && typeof module.mount === "function") {
      module.mount();
    }
    if (module) {
      modules.push(module);
    }
  });

  runtime.modules = modules;
}

function initAdminBehaviors() {
  const registry = runtime.getRegistry("adminBehaviors");
  const sharedDeps = {
    setText,
    toggleHidden,
    clearNode,
    clearValue,
    formatDateTime,
    formatStatus,
    isAdminLoggedIn,
    refreshAdminData,
    renderScannedRecord,
    stopScanner,
    openConfirmModal,
    closeConfirmModal,
    getCheckInCodeInput,
    getExpireCodeInput,
    setScannerMessage,
    isAuthExpiredError,
    clearAdminViews,
    syncAdminAuthHint,
    syncAdminShell,
    redirectToAdminLogin,
    normalizeDateTimeInput,
    normalizeAccessCode,
    historyPageSize: HISTORY_PAGE_SIZE,
  };

  runtime.replaceInstances(
    "adminBehaviors",
    createRegistryMap(registry, ADMIN_BEHAVIOR_KEYS, {
      byId,
      el,
      deps: sharedDeps,
      state: adminState,
      services,
    }),
  );
}

function initVisitorBehaviors() {
  const registry = runtime.getRegistry("visitorBehaviors");
  const sharedDeps = {
    setText,
    toggleHidden,
    formatDateTime,
    formatStatus,
    normalizeDateTimeInput,
    normalizeAccessCode,
    renderVisitorPass,
  };

  runtime.replaceInstances(
    "visitorBehaviors",
    createRegistryMap(registry, VISITOR_BEHAVIOR_KEYS, {
      el,
      deps: sharedDeps,
      state: adminState,
      services,
    }),
  );
}

function getAdminBehavior(key) {
  return runtime.getInstances("adminBehaviors")?.[key] || null;
}

function getVisitorBehavior(key) {
  return runtime.getInstances("visitorBehaviors")?.[key] || null;
}

function invokeBehavior(resolver, key, method, ...args) {
  const behavior = resolver(key);
  if (typeof behavior?.[method] !== "function") {
    return undefined;
  }
  return behavior[method](...args);
}

function invokeAdmin(key, method, ...args) {
  return invokeBehavior(getAdminBehavior, key, method, ...args);
}

function invokeVisitor(key, method, ...args) {
  return invokeBehavior(getVisitorBehavior, key, method, ...args);
}

function refreshAdminData() {
  return invokeAdmin("shell", "refreshAdminData");
}

function syncAdminShell(options = {}) {
  return invokeAdmin("shell", "syncAdminShell", options);
}

function renderVisitorPass(record) {
  return invokeVisitor("pass", "renderVisitorPass", record);
}

function renderScannedRecord(record) {
  return invokeAdmin("onsite", "renderScannedRecord", record);
}

function openConfirmModal(record) {
  return invokeAdmin("onsite", "openConfirmModal", record);
}

function closeConfirmModal() {
  return invokeAdmin("onsite", "closeConfirmModal");
}

function syncAdminAuthHint() {
  return invokeAdmin("accounts", "syncAdminAuthHint");
}

function clearAdminViews(options) {
  return invokeAdmin("shell", "clearAdminViews", options);
}

function handleLogout(message, options) {
  return invokeAdmin("accounts", "handleLogout", message, options);
}

function syncScannerSupport() {
  return invokeAdmin("onsite", "syncScannerSupport");
}

function stopScanner() {
  return invokeAdmin("onsite", "stopScanner");
}

function bindEvent(node, eventName, handler) {
  if (!node) {
    return;
  }
  node.addEventListener(eventName, handler);
}

function bindVisitorEvent(node, eventName, key, method) {
  bindEvent(node, eventName, (event) => invokeVisitor(key, method, event));
}

function bindAdminEvent(node, eventName, key, method) {
  bindEvent(node, eventName, (event) => invokeAdmin(key, method, event));
}

function bindAdminRefresh(node, key, readMethod, loadMethod) {
  bindEvent(node, "click", () => invokeAdmin(key, loadMethod, invokeAdmin(key, readMethod) || {}));
}

[
  [el.pingButton, "click", "home", "handlePing"],
  [el.applyForm, "submit", "apply", "handleApplySubmit"],
  [el.queryForm, "submit", "query", "handleQuerySubmit"],
  [el.copyPassPayloadButton, "click", "pass", "handleCopyPassPayload"],
].forEach(([node, eventName, key, method]) => bindVisitorEvent(node, eventName, key, method));

[
  [el.refreshAdminButton, "click", "pending", "loadPendingAppointments"],
  [el.refreshStatsButton, "click", "dashboard", "loadStats"],
  [el.refreshOverviewButton, "click", "dashboard", "loadOverview"],
  [el.expireStaleButton, "click", "dashboard", "handleExpireStaleAppointments"],
  [el.startScanButton, "click", "onsite", "handleStartScan"],
  [el.scanCheckInButton, "click", "onsite", "handleScanCheckIn"],
  [el.stopScanButton, "click", "onsite", "handleStopScan"],
  [el.inspectScanButton, "click", "onsite", "handleInspectScannedCode"],
  [el.confirmCheckInButton, "click", "onsite", "handleConfirmCheckIn"],
  [el.checkInForm, "submit", "onsite", "handleCheckInSubmit"],
  [el.expireForm, "submit", "onsite", "handleExpireSubmit"],
  [el.refreshAccountButton, "click", "accounts", "loadCurrentAccount"],
  [el.refreshUsersButton, "click", "accounts", "loadAdminUsers"],
  [el.createUserForm, "submit", "accounts", "handleCreateAdminUser"],
  [el.editUserForm, "submit", "accounts", "handleEditAdminUser"],
  [el.cancelUserEditButton, "click", "accounts", "handleCancelUserEdit"],
  [el.passwordForm, "submit", "accounts", "handlePasswordSubmit"],
  [el.historyForm, "submit", "history", "handleHistorySubmit"],
  [el.clearHistoryFiltersButton, "click", "history", "handleClearHistoryFilters"],
  [el.logsForm, "submit", "logs", "handleLogsSubmit"],
  [el.loadMoreLogsButton, "click", "logs", "handleLoadMoreLogs"],
  [el.historyPrevButton, "click", "history", "goToPrevHistoryPage"],
  [el.historyNextButton, "click", "history", "goToNextHistoryPage"],
].forEach(([node, eventName, key, method]) => bindAdminEvent(node, eventName, key, method));

bindEvent(el.closeConfirmModalButton, "click", () => closeConfirmModal());
bindEvent(el.logoutButton, "click", () => handleLogout());
bindAdminRefresh(el.refreshHistoryButton, "history", "readHistoryFilters", "loadHistory");
bindAdminRefresh(el.refreshLogsButton, "logs", "readLogFilters", "loadLogs");
bindEvent(window, "hashchange", () => syncAdminShell());
bindEvent(window, "visitor:auth-expired", (event) => {
  const message = event?.detail?.message || "登录已失效，请重新登录。";
  invokeAdmin("accounts", "handleSessionExpired", message);
});

initAdminModules();
initAdminBehaviors();
initVisitorBehaviors();
renderVisitorPass(null);
syncScannerSupport();
syncAdminAuthHint();
syncAdminShell({ instant: true });

bindEvent(window, "beforeunload", () => {
  stopScanner();
  closeConfirmModal();
});
