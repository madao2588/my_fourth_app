(function registerAdminLogsPage(global) {
  const pageRegistry = (global.AdminPages = global.AdminPages || {});
  const behaviorRegistry = (global.AdminBehaviors = global.AdminBehaviors || {});

  pageRegistry.logs = function initAdminLogsPage(context) {
    return {
      key: "logs",
      sectionId: "logs-section",
      refreshButtonIds: ["refresh-logs-button", "load-more-logs-button"],
      mount() {
        const section = context.byId("logs-section");
        if (section) {
          section.dataset.module = "logs";
        }
        return section || null;
      },
    };
  };

  behaviorRegistry.logs = function createAdminLogsBehavior(context) {
    const { el, deps, state } = context;

    function buildLogLevelBadge(level) {
      return ({ INFO: "INFO", WARNING: "WARNING", ERROR: "ERROR" }[level] || level || "LOG");
    }

    function readLogFilters() {
      if (!el.logsForm) return {};
      const formData = new FormData(el.logsForm);
      const limit = Number(formData.get("log_limit") || 30);
      state.setCurrentLogLimit(limit);
      return {
        level: formData.get("log_level"),
        limit,
        keyword: formData.get("log_keyword"),
        date_from: deps.normalizeDateTimeInput(formData.get("log_date_from")),
        date_to: deps.normalizeDateTimeInput(formData.get("log_date_to")),
      };
    }

    function renderLogs(logs) {
      if (!el.logsListNode) return;
      deps.clearNode(el.logsListNode);
      deps.toggleHidden(el.logsEmptyNode, logs.length !== 0);

      logs.forEach((item) => {
        const article = document.createElement("article");
        article.className = "activity-item";
        article.innerHTML = `<div class="activity-meta"><span class="status-badge">${buildLogLevelBadge(item.level)}</span><span class="activity-time">${item.timestamp}</span></div><h3 class="activity-title">${item.level}</h3><p class="activity-desc">${item.message}</p>`;

        const actionBar = document.createElement("div");
        actionBar.className = "actions";

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "ghost";
        copyButton.textContent = "复制日志";
        copyButton.addEventListener("click", async () => {
          if (!navigator.clipboard?.writeText) {
            deps.setText(el.logsResultNode, "当前浏览器不支持直接复制日志。");
            return;
          }

          try {
            await navigator.clipboard.writeText(item.raw);
            deps.setText(el.logsResultNode, "日志内容已复制。");
          } catch (error) {
            deps.setText(el.logsResultNode, "日志复制失败，请稍后重试。");
          }
        });

        actionBar.appendChild(copyButton);
        article.appendChild(actionBar);
        el.logsListNode.appendChild(article);
      });

      deps.setText(el.logsPageInfoNode, logs.length ? `当前已展示最近 ${logs.length} 条日志。` : "当前没有更多日志可展示。");
    }

    async function loadLogs(filters = {}) {
      if (!el.logsResultNode || !el.logsListNode) return;
      if (!deps.isAdminLoggedIn()) {
        deps.clearNode(el.logsListNode);
        deps.toggleHidden(el.logsEmptyNode, true);
        deps.setText(el.logsResultNode, "未登录，无法加载系统日志。");
        return;
      }

      deps.setText(el.logsResultNode, "正在加载系统日志...");

      try {
        const logs = await global.visitorApi.getAdminLogs(filters);
        renderLogs(logs);
        if (!logs.length) {
          deps.toggleHidden(el.logsEmptyNode, false);
          deps.setText(el.logsResultNode, "当前没有符合条件的日志。");
          return;
        }

        deps.setText(el.logsResultNode, `已加载 ${logs.length} 条系统日志。`);
      } catch (error) {
        deps.setText(el.logsResultNode, `日志加载失败：${error.message}`);
      }
    }

    async function handleLogsSubmit(event) {
      event.preventDefault();
      await loadLogs(readLogFilters());
    }

    async function handleLoadMoreLogs() {
      if (!el.logsForm) return;
      const limitInput = el.logsForm.elements.namedItem("log_limit");
      const nextLimit = Math.min(state.getCurrentLogLimit() + 20, 200);
      state.setCurrentLogLimit(nextLimit);
      if (limitInput) limitInput.value = String(nextLimit);
      await loadLogs(readLogFilters());
    }

    return {
      readLogFilters,
      loadLogs,
      handleLogsSubmit,
      handleLoadMoreLogs,
    };
  };
})(window);
