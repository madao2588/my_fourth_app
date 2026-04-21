window.APP_CONFIG = {
  apiBaseUrl:
    window.location.protocol === "http:" || window.location.protocol === "https:"
      ? window.location.origin
      : "http://127.0.0.1:8000",
  displayTimeZone: "Asia/Shanghai",
};
