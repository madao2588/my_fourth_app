(function registerVisitorApplyPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const behaviorRegistry = runtime.getRegistry("visitorBehaviors");

  behaviorRegistry.apply = function createVisitorApplyBehavior(context) {
    const { el, deps, services } = context;
    const { visitorApi } = services;

    async function handleApplySubmit(event) {
      event.preventDefault();
      const formData = new FormData(el.applyForm);
      const payload = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        reason: formData.get("reason"),
        target_person: formData.get("target_person"),
        appointment_time: deps.normalizeDateTimeInput(formData.get("appointment_time")),
      };

      deps.setText(el.applyResultNode, "正在提交预约...");
      deps.toggleHidden(el.ticketCard, true);

      try {
        const result = await visitorApi.applyVisit(payload);
        deps.setText(el.applyResultNode, "预约提交成功。");
        deps.setText(el.applicationIdNode, result.application_id);
        deps.setText(el.accessCodeNode, result.access_code);
        deps.toggleHidden(el.ticketCard, false);
        deps.renderVisitorPass({
          id: result.application_id,
          access_code: result.access_code,
          name: payload.name,
          phone: payload.phone,
          target_person: payload.target_person,
          appointment_time: payload.appointment_time,
          admin_remark: "",
          approved_by: "",
          approved_at: "",
          checked_in_at: "",
          status: "pending",
        });
        el.applyForm.reset();
      } catch (error) {
        deps.setText(el.applyResultNode, `提交失败：${error.message}`);
      }
    }

    return {
      handleApplySubmit,
    };
  };
})(window);
