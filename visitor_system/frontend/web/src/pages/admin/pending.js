(function registerAdminPendingPage(global) {
  const pageRegistry = (global.AdminPages = global.AdminPages || {});
  const behaviorRegistry = (global.AdminBehaviors = global.AdminBehaviors || {});

  pageRegistry.pending = function initAdminPendingPage(context) {
    return {
      key: "pending",
      sectionId: "pending-section",
      refreshButtonIds: ["refresh-admin-button"],
      mount() {
        const section = context.byId("pending-section");
        if (section) {
          section.dataset.module = "pending";
        }
        return section || null;
      },
    };
  };

  behaviorRegistry.pending = function createAdminPendingBehavior(context) {
    const { el, deps } = context;

    function buildPendingItem(record) {
      const wrapper = document.createElement("article");
      wrapper.className = "pending-item";

      const title = document.createElement("h3");
      title.textContent = `${record.name} / ${record.phone}`;

      const meta = document.createElement("div");
      meta.className = "pending-meta";
      meta.innerHTML = [
        `<p><strong>受访人：</strong>${record.target_person}</p>`,
        `<p><strong>预约时间：</strong>${deps.formatDateTime(record.appointment_time)}</p>`,
        `<p><strong>访问事由：</strong>${record.reason}</p>`,
        `<p><strong>状态：</strong>${deps.formatStatus(record.status)}</p>`,
        `<p><strong>入场码：</strong>${record.access_code}</p>`,
      ].join("");

      const remarkInput = document.createElement("textarea");
      remarkInput.className = "remark-input";
      remarkInput.placeholder = "可填写审批备注";

      const actionBar = document.createElement("div");
      actionBar.className = "actions";

      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.textContent = "通过";

      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.className = "ghost";
      rejectButton.textContent = "拒绝";

      approveButton.addEventListener("click", async () => {
        await handleAudit(record.id, "approve", remarkInput.value);
      });
      rejectButton.addEventListener("click", async () => {
        await handleAudit(record.id, "reject", remarkInput.value);
      });

      actionBar.append(approveButton, rejectButton);
      wrapper.append(title, meta, remarkInput, actionBar);
      return wrapper;
    }

    async function loadPendingAppointments() {
      if (!el.pendingListNode || !el.adminResultNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        deps.clearNode(el.pendingListNode);
        deps.toggleHidden(el.adminEmptyNode, true);
        deps.setText(el.adminResultNode, "未登录，无法加载待审批列表。");
        deps.syncAdminAuthHint();
        return;
      }

      deps.setText(el.adminResultNode, "正在加载待审批列表...");
      deps.toggleHidden(el.adminEmptyNode, true);
      deps.clearNode(el.pendingListNode);

      try {
        const records = await global.visitorApi.getPendingAppointments();
        if (!records.length) {
          deps.toggleHidden(el.adminEmptyNode, false);
          deps.setText(el.adminResultNode, "待审批列表已更新。");
          return;
        }

        records.forEach((record) => el.pendingListNode.appendChild(buildPendingItem(record)));
        deps.setText(el.adminResultNode, `已加载 ${records.length} 条待审批记录。`);
      } catch (error) {
        deps.setText(el.adminResultNode, `加载失败：${error.message}`);
      }
    }

    async function handleAudit(recordId, action, remark) {
      deps.setText(el.adminResultNode, action === "approve" ? "正在执行通过操作..." : "正在执行拒绝操作...");

      try {
        await global.visitorApi.auditAppointment(recordId, { action, remark });
        deps.setText(el.adminResultNode, "审批已完成，列表已刷新。");
        await deps.refreshAdminData();
      } catch (error) {
        deps.setText(el.adminResultNode, `审批失败：${error.message}`);
      }
    }

    return {
      loadPendingAppointments,
      handleAudit,
    };
  };
})(window);
