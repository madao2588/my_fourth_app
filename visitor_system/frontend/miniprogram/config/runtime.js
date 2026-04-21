const DEFAULT_QR_SERVICE_BASE_URL = "https://api.qrserver.com/v1/create-qr-code/";

const DEFAULT_CONFIG_BY_ENV_VERSION = Object.freeze({
  develop: Object.freeze({
    apiBaseUrl: "http://127.0.0.1:8012",
    qrServiceBaseUrl: DEFAULT_QR_SERVICE_BASE_URL,
  }),
  trial: Object.freeze({
    apiBaseUrl: "",
    qrServiceBaseUrl: DEFAULT_QR_SERVICE_BASE_URL,
  }),
  release: Object.freeze({
    apiBaseUrl: "",
    qrServiceBaseUrl: DEFAULT_QR_SERVICE_BASE_URL,
  }),
});

let privateConfigByEnvVersion = {};

try {
  privateConfigByEnvVersion = require("./runtime.private").CONFIG_BY_ENV_VERSION || {};
} catch (_) {
  privateConfigByEnvVersion = {};
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function mergeConfigByEnvVersion(defaults, overrides) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(defaults).map(([envVersion, config]) => {
        const override = overrides[envVersion] || {};
        return [
          envVersion,
          Object.freeze({
            ...config,
            ...override,
            apiBaseUrl: normalizeBaseUrl(
              Object.prototype.hasOwnProperty.call(override, "apiBaseUrl")
                ? override.apiBaseUrl
                : config.apiBaseUrl,
            ),
          }),
        ];
      }),
    ),
  );
}

function readEnvVersion() {
  try {
    return wx.getAccountInfoSync?.().miniProgram?.envVersion || "develop";
  } catch (_) {
    return "develop";
  }
}

function looksLikeHttpUrl(value) {
  return /^https?:\/\/[^/]+/i.test(value);
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(value);
}

function isLocalHostUrl(value) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(value);
}

function getApiBaseUrlError(envVersion, apiBaseUrl) {
  if (!apiBaseUrl) {
    if (envVersion === "develop") {
      return "Develop environment is missing apiBaseUrl in config/runtime.js.";
    }
    return `Mini program ${envVersion} environment is missing apiBaseUrl. Copy config/runtime.private.example.js to config/runtime.private.js and set an HTTPS API domain.`;
  }

  if (!looksLikeHttpUrl(apiBaseUrl)) {
    return `Mini program ${envVersion} apiBaseUrl is invalid: ${apiBaseUrl}`;
  }

  if (envVersion === "develop") {
    return "";
  }

  if (!isHttpsUrl(apiBaseUrl)) {
    return `Mini program ${envVersion} apiBaseUrl must use https:// : ${apiBaseUrl}`;
  }

  if (isLocalHostUrl(apiBaseUrl)) {
    return `Mini program ${envVersion} cannot use localhost or 127.0.0.1: ${apiBaseUrl}`;
  }

  return "";
}

const CONFIG_BY_ENV_VERSION = mergeConfigByEnvVersion(
  DEFAULT_CONFIG_BY_ENV_VERSION,
  privateConfigByEnvVersion,
);

function resolveRuntimeConfig() {
  const envVersion = readEnvVersion();
  const config = CONFIG_BY_ENV_VERSION[envVersion] || CONFIG_BY_ENV_VERSION.develop;
  const apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);

  return {
    envVersion,
    apiBaseUrl,
    apiBaseUrlError: getApiBaseUrlError(envVersion, apiBaseUrl),
    qrServiceBaseUrl: config.qrServiceBaseUrl || DEFAULT_QR_SERVICE_BASE_URL,
  };
}

module.exports = {
  CONFIG_BY_ENV_VERSION,
  getApiBaseUrlError,
  resolveRuntimeConfig,
};
