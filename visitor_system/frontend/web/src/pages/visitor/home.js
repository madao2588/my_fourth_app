(function registerVisitorHomePage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const behaviorRegistry = runtime.getRegistry("visitorBehaviors");

  behaviorRegistry.home = function createVisitorHomeBehavior(context) {
    const { el, deps, services } = context;
    const { visitorApi } = services;

    async function handlePing() {
      if (!el.healthNode) return;

      deps.setText(el.healthNode, "正在检查后端健康状态...");
      try {
        const payload = await visitorApi.healthCheck();
        deps.setText(el.healthNode, `后端正常：应用=${payload.status}，数据库=${payload.database}`);
      } catch (error) {
        deps.setText(el.healthNode, `后端检查失败：${error.message}`);
      }
    }

    return {
      handlePing,
    };
  };
})(window);
