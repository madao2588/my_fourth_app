(function registerVisitorShared(global) {
  function byId(id) {
    return document.getElementById(id);
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function toggleHidden(node, hidden) {
    if (node) node.classList.toggle("hidden", hidden);
  }

  function clearNode(node) {
    if (node) node.innerHTML = "";
  }

  function clearValue(node) {
    if (node && "value" in node) node.value = "";
  }

  function formatStatus(status) {
    return (
      {
        pending: "pending",
        approved: "approved",
        rejected: "rejected",
        expired: "expired",
      }[status] || status
    );
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  function normalizeDateTimeInput(value) {
    return value ? new Date(value).toISOString() : "";
  }

  function normalizeAccessCode(value) {
    return (value || "").trim().toUpperCase();
  }

  global.VisitorShared = {
    byId,
    setText,
    toggleHidden,
    clearNode,
    clearValue,
    formatStatus,
    formatDateTime,
    normalizeDateTimeInput,
    normalizeAccessCode,
  };
})(window);
