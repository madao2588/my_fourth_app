(function registerAdminDashboardPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const pageRegistry = runtime.getRegistry("adminPages");
  const behaviorRegistry = runtime.getRegistry("adminBehaviors");

  pageRegistry.dashboard = function initAdminDashboardPage(context) {
    return {
      key: "dashboard",
      sectionId: "dashboard-section",
      refreshButtonIds: ["refresh-stats-button", "refresh-overview-button", "expire-stale-button"],
      mount() {
        const section = context.byId("dashboard-section");
        if (section) {
          section.dataset.module = "dashboard";
        }
        return section || null;
      },
    };
  };

  behaviorRegistry.dashboard = function createAdminDashboardBehavior(context) {
    const { el, deps, services } = context;
    const { visitorApi } = services;

    function renderStats(stats) {
      if (!stats) {
        return;
      }

      deps.setText(el.statsTotalNode, stats.total);
      deps.setText(el.statsPendingNode, stats.pending);
      deps.setText(el.statsApprovedNode, stats.approved);
      deps.setText(el.statsRejectedNode, stats.rejected);
      deps.setText(el.statsExpiredNode, stats.expired);
      deps.setText(el.statsCheckedInNode, stats.checked_in);
    }

    function buildActivityBadgeText(eventType) {
      return (
        {
          created: "新申请",
          approved: "已通过",
          rejected: "已拒绝",
          checked_in: "已签到",
          expired: "已过期",
        }[eventType] || eventType
      );
    }

    function buildActivityBadgeClass(eventType) {
      return (
        {
          created: "pending",
          approved: "approved",
          rejected: "rejected",
          checked_in: "checked_in",
          expired: "expired",
        }[eventType] || "pending"
      );
    }

    function renderOverview(overview) {
      if (!overview) {
        return;
      }

      deps.setText(el.todayCreatedNode, overview.today.created);
      deps.setText(el.todayPendingNode, overview.today.pending);
      deps.setText(el.todayApprovedNode, overview.today.approved);
      deps.setText(el.todayRejectedNode, overview.today.rejected);
      deps.setText(el.todayCheckedInNode, overview.today.checked_in);
      deps.setText(el.todayExpiredNode, overview.today.expired);

      if (!el.activityListNode) {
        return;
      }

      deps.clearNode(el.activityListNode);
      const activities = overview.recent_activity || [];
      deps.toggleHidden(el.activityEmptyNode, activities.length !== 0);

      activities.forEach((item) => {
        const article = document.createElement("article");
        article.className = "activity-item";
        article.innerHTML = [
          `<div class="activity-meta"><span class="status-badge status-${buildActivityBadgeClass(item.event_type)}">${buildActivityBadgeText(item.event_type)}</span><span class="activity-time">${deps.formatDateTime(item.happened_at)}</span></div>`,
          `<h3 class="activity-title">${item.title}</h3>`,
          `<p class="activity-desc">${item.description}</p>`,
          `<p class="activity-extra">访客：${item.visitor_name} / ${item.phone} / 入场码：${item.access_code} / 申请编号：${item.appointment_id}</p>`,
        ].join("");
        el.activityListNode.appendChild(article);
      });
    }

    async function loadStats() {
      if (!el.statsResultNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.statsResultNode, "未登录，无法加载统计数据。");
        return;
      }

      deps.setText(el.statsResultNode, "正在加载统计数据...");

      try {
        const stats = await visitorApi.getAdminStats();
        renderStats(stats);
        deps.setText(el.statsResultNode, "统计数据已更新。");
      } catch (error) {
        deps.setText(el.statsResultNode, `统计加载失败：${error.message}`);
      }
    }

    async function loadOverview() {
      if (!el.overviewResultNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.overviewResultNode, "未登录，无法加载今日看板。");
        deps.clearNode(el.activityListNode);
        deps.toggleHidden(el.activityEmptyNode, true);
        return;
      }

      deps.setText(el.overviewResultNode, "正在加载今日看板...");

      try {
        const overview = await visitorApi.getAdminOverview();
        renderOverview(overview);
        deps.setText(el.overviewResultNode, "今日看板已更新。");
      } catch (error) {
        deps.setText(el.overviewResultNode, `看板加载失败：${error.message}`);
      }
    }

    async function handleExpireStaleAppointments() {
      if (!el.expireStaleResultNode) {
        return;
      }

      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.expireStaleResultNode, "未登录，无法执行批量过期清理。");
        return;
      }

      deps.setText(el.expireStaleResultNode, "正在清理超时未签到预约...");

      try {
        const result = await visitorApi.expireStaleAppointments();
        deps.setText(
          el.expireStaleResultNode,
          `批量清理完成：本次共处理 ${result.expired_count} 条，阈值 ${result.threshold_hours} 小时。`,
        );
        await deps.refreshAdminData();
      } catch (error) {
        deps.setText(el.expireStaleResultNode, `批量清理失败：${error.message}`);
      }
    }

    return {
      loadStats,
      loadOverview,
      handleExpireStaleAppointments,
    };
  };
})(window);
