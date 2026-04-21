(function initializeAppConfig(global) {
  function normalizeBaseUrl(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  const inferredSameOriginBaseUrl =
    global.location.protocol === "http:" || global.location.protocol === "https:"
      ? normalizeBaseUrl(global.location.origin)
      : "";
  const runtimeConfig = global.__VISITOR_RUNTIME_CONFIG__ || {};
  const existingConfig = global.APP_CONFIG || {};
  const configuredApiBaseUrl =
    normalizeBaseUrl(runtimeConfig.apiBaseUrl) ||
    normalizeBaseUrl(existingConfig.apiBaseUrl) ||
    inferredSameOriginBaseUrl ||
    "http://127.0.0.1:8000";

  global.APP_CONFIG = {
    ...existingConfig,
    ...runtimeConfig,
    apiBaseUrl: configuredApiBaseUrl,
    displayTimeZone: runtimeConfig.displayTimeZone || existingConfig.displayTimeZone || "Asia/Shanghai",
  };
})(window);
