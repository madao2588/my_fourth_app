window.APP_CONFIG = {
  apiBaseUrl:
    window.location.protocol === "http:" || window.location.protocol === "https:"
      ? window.location.origin
      : "http://127.0.0.1:8000",
  qrServiceBaseUrl: "https://api.qrserver.com/v1/create-qr-code/",
};
