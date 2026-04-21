(function registerAdminHistoryPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const pageRegistry = runtime.getRegistry("adminPages");
  const behaviorRegistry = runtime.getRegistry("adminBehaviors");

  pageRegistry.history = function initAdminHistoryPage(context) {
    return {
      key: "history",
      sectionId: "history-section",
      refreshButtonIds: ["refresh-history-button", "clear-history-filters-button", "history-prev-button", "history-next-button"],
      mount() {
        const section = context.byId("history-section");
        if (section) {
          section.dataset.module = "history";
        }
        return section || null;
      },
    };
  };

  behaviorRegistry.history = function createAdminHistoryBehavior(context) {
    const { el, deps, state, services } = context;
    const { visitorApi } = services;
    const historyState = state.history;

    function buildHistoryItem(record) {
      const wrapper = document.createElement("article");
      wrapper.className = "pending-item";
      wrapper.innerHTML = [
        `<h3>${record.name} / ${record.phone}</h3>`,
        '<div class="pending-meta">',
        `<p><strong>状态：</strong>${deps.formatStatus(record.status)}</p>`,
        `<p><strong>预约时间：</strong>${deps.formatDateTime(record.appointment_time)}</p>`,
        `<p><strong>受访人：</strong>${record.target_person}</p>`,
        `<p><strong>来访事由：</strong>${record.reason}</p>`,
        `<p><strong>审批备注：</strong>${record.admin_remark || "-"}</p>`,
        `<p><strong>审批人：</strong>${record.approved_by || "-"}</p>`,
        `<p><strong>审批时间：</strong>${deps.formatDateTime(record.approved_at)}</p>`,
        `<p><strong>签到时间：</strong>${deps.formatDateTime(record.checked_in_at)}</p>`,
        `<p><strong>过期时间：</strong>${deps.formatDateTime(record.expired_at)}</p>`,
        `<p><strong>创建时间：</strong>${deps.formatDateTime(record.created_at)}</p>`,
        `<p><strong>入场码：</strong>${record.access_code}</p>`,
        "</div>",
      ].join("");
      return wrapper;
    }

    function renderHistoryPage() {
      if (!el.historyListNode) return;

      const records = historyState.getRecords();
      const total = historyState.getTotal();
      let page = historyState.getPage();

      deps.clearNode(el.historyListNode);
      deps.toggleHidden(el.historyEmptyNode, total !== 0);

      const totalPages = Math.max(1, Math.ceil(total / deps.historyPageSize));
      page = Math.min(Math.max(page, 1), totalPages);
      historyState.setPage(page);

      records.forEach((record) => el.historyListNode.appendChild(buildHistoryItem(record)));

      if (!total) {
        deps.setText(el.historyPageInfoNode, "当前没有可分页的历史记录。");
      } else {
        deps.setText(el.historyPageInfoNode, `第 ${page} / ${totalPages} 页，共 ${total} 条记录。`);
      }

      if (el.historyPrevButton) el.historyPrevButton.disabled = page <= 1;
      if (el.historyNextButton) el.historyNextButton.disabled = page >= totalPages;
    }

    function readHistoryFilters() {
      if (!el.historyForm) return {};

      const formData = new FormData(el.historyForm);
      return {
        status: formData.get("history_status"),
        phone: formData.get("history_phone"),
        date_from: deps.normalizeDateTimeInput(formData.get("history_date_from")),
        date_to: deps.normalizeDateTimeInput(formData.get("history_date_to")),
        page: historyState.getPage(),
        page_size: deps.historyPageSize,
      };
    }

    async function loadHistory(filters = {}) {
      if (!el.historyListNode || !el.historyResultNode) return;

      if (!deps.isAdminLoggedIn()) {
        deps.clearNode(el.historyListNode);
        deps.toggleHidden(el.historyEmptyNode, true);
        deps.setText(el.historyResultNode, "未登录，无法加载历史记录。");
        return;
      }

      deps.setText(el.historyResultNode, "正在加载历史记录...");
      deps.toggleHidden(el.historyEmptyNode, true);
      deps.clearNode(el.historyListNode);

      try {
        const payload = await visitorApi.getAdminHistory(filters);
        historyState.setRecords(payload.items);
        historyState.setTotal(payload.total);
        historyState.setPage(payload.page);
        renderHistoryPage();

        if (!payload.total) {
          deps.toggleHidden(el.historyEmptyNode, false);
          deps.setText(el.historyResultNode, "历史记录已更新。");
          return;
        }

        deps.setText(el.historyResultNode, `已加载第 ${payload.page} 页，共 ${payload.total} 条历史记录。`);
      } catch (error) {
        deps.setText(el.historyResultNode, `加载失败：${error.message}`);
      }
    }

    async function handleHistorySubmit(event) {
      event.preventDefault();
      historyState.setPage(1);
      await loadHistory(readHistoryFilters());
    }

    async function handleClearHistoryFilters() {
      if (!el.historyForm) return;

      el.historyForm.reset();
      historyState.setPage(1);
      await loadHistory(readHistoryFilters());
    }

    async function goToPrevHistoryPage() {
      if (historyState.getPage() > 1) {
        historyState.setPage(historyState.getPage() - 1);
        await loadHistory(readHistoryFilters());
      }
    }

    async function goToNextHistoryPage() {
      const totalPages = Math.max(1, Math.ceil(historyState.getTotal() / deps.historyPageSize));
      if (historyState.getPage() < totalPages) {
        historyState.setPage(historyState.getPage() + 1);
        await loadHistory(readHistoryFilters());
      }
    }

    return {
      readHistoryFilters,
      loadHistory,
      handleHistorySubmit,
      handleClearHistoryFilters,
      goToPrevHistoryPage,
      goToNextHistoryPage,
    };
  };
})(window);
