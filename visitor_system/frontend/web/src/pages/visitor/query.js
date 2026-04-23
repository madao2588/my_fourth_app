(function registerVisitorQueryPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const behaviorRegistry = runtime.getRegistry("visitorBehaviors");

  behaviorRegistry.query = function createVisitorQueryBehavior(context) {
    const { el, deps, services } = context;
    const { visitorApi } = services;

    async function handleQuerySubmit(event) {
      event.preventDefault();
      const phone = new FormData(el.queryForm).get("query_phone");
      deps.setText(el.queryResultNode, "正在查询...");
      deps.toggleHidden(el.queryCard, true);

      try {
        const record = (await visitorApi.queryByPhone(phone)).record;
        deps.setText(el.queryNameNode, record.name);
        deps.setText(el.queryStatusNode, deps.formatStatus(record.status));
        deps.setText(el.queryRegionNode, record.region || "-");
        deps.setText(el.queryTimeNode, deps.formatDateTime(record.appointment_time));
        deps.setText(el.queryTargetNode, record.target_person);
        deps.setText(el.queryRemarkNode, record.admin_remark || "-");
        deps.toggleHidden(el.queryCard, false);
        deps.renderVisitorPass(record);
        deps.setText(el.queryResultNode, "查询完成。");
      } catch (error) {
        deps.renderVisitorPass(null);
        deps.setText(el.queryResultNode, `查询失败：${error.message}`);
      }
    }

    return {
      handleQuerySubmit,
    };
  };
})(window);
