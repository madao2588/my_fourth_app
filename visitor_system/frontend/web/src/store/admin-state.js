(function registerVisitorAppState(global) {
  function createSessionState() {
    const state = {
      needsPasswordChange: false,
      currentRole: "",
      currentUsername: "",
    };

    return {
      getNeedsPasswordChange() {
        return state.needsPasswordChange;
      },
      setNeedsPasswordChange(value) {
        state.needsPasswordChange = Boolean(value);
      },
      getCurrentRole() {
        return state.currentRole;
      },
      setCurrentRole(value) {
        state.currentRole = value || "";
      },
      getCurrentUsername() {
        return state.currentUsername;
      },
      setCurrentUsername(value) {
        state.currentUsername = value || "";
      },
      reset() {
        state.needsPasswordChange = false;
        state.currentRole = "";
        state.currentUsername = "";
      },
    };
  }

  function createOnsiteState() {
    const state = {
      lastScannedAccessCode: "",
    };

    return {
      getLastScannedAccessCode() {
        return state.lastScannedAccessCode;
      },
      setLastScannedAccessCode(value) {
        state.lastScannedAccessCode = value || "";
      },
      reset() {
        state.lastScannedAccessCode = "";
      },
    };
  }

  function createHistoryState() {
    const state = {
      records: [],
      page: 1,
      total: 0,
    };

    return {
      getRecords() {
        return state.records;
      },
      setRecords(value) {
        state.records = Array.isArray(value) ? value : [];
      },
      getPage() {
        return state.page;
      },
      setPage(value) {
        state.page = Number(value) || 1;
      },
      getTotal() {
        return state.total;
      },
      setTotal(value) {
        state.total = Number(value) || 0;
      },
      reset() {
        state.records = [];
        state.page = 1;
        state.total = 0;
      },
    };
  }

  function createLogsState() {
    const state = {
      currentLimit: 30,
    };

    return {
      getCurrentLimit() {
        return state.currentLimit;
      },
      setCurrentLimit(value) {
        state.currentLimit = Number(value) || 30;
      },
      reset() {
        state.currentLimit = 30;
      },
    };
  }

  function createVisitorAppState() {
    return {
      session: createSessionState(),
      onsite: createOnsiteState(),
      history: createHistoryState(),
      logs: createLogsState(),
    };
  }

  global.createVisitorAppState = createVisitorAppState;
  global.createVisitorAdminState = createVisitorAppState;
})(window);
