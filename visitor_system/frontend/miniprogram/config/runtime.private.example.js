module.exports = {
  CONFIG_BY_ENV_VERSION: {
    develop: {
      // Optional. Keep local development on your machine or replace with LAN IP.
      apiBaseUrl: "http://127.0.0.1:8012",
    },
    trial: {
      // Required for preview / staging builds in WeChat.
      apiBaseUrl: "https://api-staging.example.com",
    },
    release: {
      // Required for the production mini program.
      apiBaseUrl: "https://api.example.com",
    },
  },
};
