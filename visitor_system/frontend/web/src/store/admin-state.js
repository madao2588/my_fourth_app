(function registerVisitorAdminState(global) {
  function createVisitorAdminState() {
    const state = {
      needsPasswordChange: false,
      lastScannedAccessCode: "",
      historyRecords: [],
      historyPage: 1,
      historyTotal: 0,
      currentLogLimit: 30,
    };

    return {
      getNeedsPasswordChange() {
        return state.needsPasswordChange;
      },
      setNeedsPasswordChange(value) {
        state.needsPasswordChange = Boolean(value);
      },
      getLastScannedAccessCode() {
        return state.lastScannedAccessCode;
      },
      setLastScannedAccessCode(value) {
        state.lastScannedAccessCode = value || "";
      },
      getHistoryRecords() {
        return state.historyRecords;
      },
      setHistoryRecords(value) {
        state.historyRecords = Array.isArray(value) ? value : [];
      },
      getHistoryPage() {
        return state.historyPage;
      },
      setHistoryPage(value) {
        state.historyPage = Number(value) || 1;
      },
      getHistoryTotal() {
        return state.historyTotal;
      },
      setHistoryTotal(value) {
        state.historyTotal = Number(value) || 0;
      },
      getCurrentLogLimit() {
        return state.currentLogLimit;
      },
      setCurrentLogLimit(value) {
        state.currentLogLimit = Number(value) || 30;
      },
    };
  }

  global.createVisitorAdminState = createVisitorAdminState;
})(window);
