(function registerAdminPendingPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const pageRegistry = runtime.getRegistry("adminPages");
  const behaviorRegistry = runtime.getRegistry("adminBehaviors");

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
    const { el, deps, services } = context;
    const { visitorApi } = services;

    function buildPendingItem(record) {
      const wrapper = document.createElement("article");
      wrapper.className = "pending-item approval-row";

      const visitorCell = document.createElement("div");
      visitorCell.className = "data-cell approval-visitor";
      visitorCell.innerHTML = [
        `<p class="row-primary">${record.name}</p>`,
        `<p class="row-secondary">${record.phone}</p>`,
      ].join("");

      const detailCell = document.createElement("div");
      detailCell.className = "data-cell approval-details";
      detailCell.innerHTML = [
        `<p><strong>地区：</strong>${record.region || "-"}</p>`,
        `<p><strong>受访人：</strong>${record.target_person}</p>`,
        `<p><strong>预约时间：</strong>${deps.formatDateTime(record.appointment_time)}</p>`,
        `<p><strong>访问事由：</strong>${record.reason}</p>`,
        `<p><strong>状态：</strong>${deps.formatStatus(record.status)}</p>`,
        `<p><strong>入场码：</strong>${record.access_code}</p>`,
      ].join("");

      const remarkInput = document.createElement("textarea");
      remarkInput.className = "remark-input approval-remark";
      remarkInput.placeholder = "填写审批备注";

      const remarkCell = document.createElement("div");
      remarkCell.className = "data-cell approval-remark-cell";
      remarkCell.appendChild(remarkInput);

      const actionBar = document.createElement("div");
      actionBar.className = "actions row-actions approval-actions";

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
      wrapper.append(visitorCell, detailCell, remarkCell, actionBar);
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
        const records = await visitorApi.getPendingAppointments();
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
        await visitorApi.auditAppointment(recordId, { action, remark });
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
