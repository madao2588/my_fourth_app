const { resolveRuntimeConfig } = require("./config/runtime");

App({
  globalData: resolveRuntimeConfig(),
});
