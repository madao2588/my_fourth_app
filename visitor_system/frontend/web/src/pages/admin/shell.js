(function registerAdminShellBehavior(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const behaviorRegistry = runtime.getRegistry("adminBehaviors");

  behaviorRegistry.shell = function createAdminShellBehavior(context) {
    const { el, deps, state } = context;
    const sessionState = state.session;
    const historyState = state.history;

    const ADMIN_VIEWS = ["accounts", "dashboard", "pending", "onsite", "history", "logs"];
    const ROLE_VIEW_ACCESS = {
      madao: ADMIN_VIEWS,
      madao1: ADMIN_VIEWS,
      madao2: ["accounts", "dashboard", "pending", "history"],
      madao3: ["accounts", "onsite"],
      madao4: ["accounts", "dashboard", "history", "logs"],
    };
    const ROLE_DEFAULT_VIEW = {
      madao: "accounts",
      madao1: "dashboard",
      madao2: "pending",
      madao3: "onsite",
      madao4: "logs",
    };
    const POST_LOGIN_TARGET_STORAGE_KEY = "visitor_admin_next_target";

    const loadedAdminViews = new Set();
    const loadingAdminViews = new Set();
    let activeAdminView = "";

    function getAdminBehavior(name) {
      return runtime?.getInstances("adminBehaviors")?.[name] || null;
    }

    function adminSections() {
      return Array.from(document.querySelectorAll("[data-view]"));
    }

    function adminNavLinks() {
      return Array.from(document.querySelectorAll("[data-view-link]"));
    }

    function normalizeAdminView(value) {
      return ADMIN_VIEWS.includes(value) ? value : "";
    }

    function readStoredAdminTargetView() {
      try {
        const target = window.sessionStorage.getItem(POST_LOGIN_TARGET_STORAGE_KEY) || "";
        if (!target) {
          return "";
        }
        const url = new URL(target, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
          return "";
        }
        return normalizeAdminView(url.hash.slice(1));
      } catch (_) {
        return "";
      }
    }

    function clearStoredAdminTargetView() {
      try {
        window.sessionStorage.removeItem(POST_LOGIN_TARGET_STORAGE_KEY);
      } catch (_) {
        // Ignore storage errors.
      }
    }

    function getAllowedAdminViews() {
      const role = sessionState.getCurrentRole?.() || "";
      if (!deps.isAdminLoggedIn() || !role) return ["accounts"];
      if (sessionState.getNeedsPasswordChange()) return ["accounts"];
      return ROLE_VIEW_ACCESS[role] || ["accounts"];
    }

    function getDefaultAdminView() {
      const role = sessionState.getCurrentRole?.() || "";
      if (!deps.isAdminLoggedIn() || !role) return "accounts";
      if (sessionState.getNeedsPasswordChange()) return "accounts";
      return ROLE_DEFAULT_VIEW[role] || getAllowedAdminViews()[0] || "accounts";
    }

    function canUseAdminView(view) {
      return getAllowedAdminViews().includes(view);
    }

    function syncAdminNavigation() {
      const allowedViews = getAllowedAdminViews();
      adminNavLinks().forEach((link) => {
        const view = link.dataset.viewLink;
        const allowed = allowedViews.includes(view);
        link.classList.toggle("hidden", !allowed);
        link.setAttribute("aria-hidden", allowed ? "false" : "true");
      });
    }

    function showAdminView(targetView, options = {}) {
      const allowedViews = getAllowedAdminViews();
      let view = normalizeAdminView(targetView) || getDefaultAdminView();
      if (!allowedViews.includes(view)) view = getDefaultAdminView();
      activeAdminView = view;

      adminSections().forEach((section) => {
        deps.toggleHidden(section, section.dataset.view !== view);
      });
      adminNavLinks().forEach((link) => {
        const active = link.dataset.viewLink === view;
        link.classList.toggle("active", active);
        link.setAttribute("aria-current", active ? "page" : "false");
      });

      const shouldPersistHash =
        !options.skipHash && (Boolean(window.location.hash) || (deps.isAdminLoggedIn() && Boolean(sessionState.getCurrentRole?.())));
      if (shouldPersistHash && window.location.hash !== `#${view}`) {
        window.history.replaceState(null, "", `#${view}`);
      }
      window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
      return view;
    }

    async function loadAdminViewData(view, options = {}) {
      if (!normalizeAdminView(view) || !canUseAdminView(view)) return;
      if (loadingAdminViews.has(view)) return;
      if (!options.force && loadedAdminViews.has(view)) return;
      if (view !== "accounts" && (!deps.isAdminLoggedIn() || sessionState.getNeedsPasswordChange())) return;

      loadingAdminViews.add(view);
      try {
        const accounts = getAdminBehavior("accounts");
        const dashboard = getAdminBehavior("dashboard");
        const pending = getAdminBehavior("pending");
        const history = getAdminBehavior("history");
        const logs = getAdminBehavior("logs");

        if (view === "accounts") {
          await accounts?.loadCurrentAccount?.();
          await accounts?.loadAdminUsers?.();
        } else if (view === "dashboard") {
          await Promise.all([dashboard?.loadStats?.(), dashboard?.loadOverview?.()]);
        } else if (view === "pending") {
          await pending?.loadPendingAppointments?.();
        } else if (view === "history") {
          const filters = history?.readHistoryFilters?.() || {};
          await history?.loadHistory?.(filters);
        } else if (view === "logs") {
          const filters = logs?.readLogFilters?.() || {};
          await logs?.loadLogs?.(filters);
        }

        loadedAdminViews.add(view);
      } finally {
        loadingAdminViews.delete(view);
      }
    }

    async function refreshAdminData() {
      const viewsToRefresh = Array.from(loadedAdminViews).filter((view) => view !== "accounts" && canUseAdminView(view));
      if (viewsToRefresh.length === 0 && activeAdminView && activeAdminView !== "accounts") {
        viewsToRefresh.push(activeAdminView);
      }
      await Promise.all(viewsToRefresh.map((view) => loadAdminViewData(view, { force: true })));
    }

    function syncAdminShell(options = {}) {
      syncAdminNavigation();
      const requestedView = normalizeAdminView(window.location.hash.slice(1));
      const storedView = readStoredAdminTargetView();
      const preferredView =
        deps.isAdminLoggedIn() && sessionState.getCurrentRole?.() && !sessionState.getNeedsPasswordChange() && storedView
          ? storedView
          : requestedView;
      const view = showAdminView(preferredView, options);
      if (storedView && sessionState.getCurrentRole?.() && (view === storedView || view !== requestedView)) {
        clearStoredAdminTargetView();
      }
      if (!options.skipLoad) {
        void loadAdminViewData(view, { force: Boolean(options.forceLoad) });
      }
    }

    function clearAdminViews(options = {}) {
      deps.clearNode(el.pendingListNode);
      deps.clearNode(el.historyListNode);
      deps.clearNode(el.activityListNode);
      deps.clearNode(el.logsListNode);
      deps.clearNode(el.usersListNode);
      historyState.reset();
      state.logs.reset();
      loadedAdminViews.clear();
      loadingAdminViews.clear();
      activeAdminView = "";
      deps.toggleHidden(el.adminEmptyNode, true);
      deps.toggleHidden(el.historyEmptyNode, true);
      deps.toggleHidden(el.activityEmptyNode, true);
      deps.toggleHidden(el.logsEmptyNode, true);
      deps.toggleHidden(el.accountCard, true);
      sessionState.reset();
      clearStoredAdminTargetView();
      if (!options.skipSync) {
        syncAdminShell({ instant: true });
      }
      getAdminBehavior("onsite")?.renderScannedRecord?.(null);
    }

    return {
      syncAdminShell,
      refreshAdminData,
      clearAdminViews,
    };
  };
})(window);
