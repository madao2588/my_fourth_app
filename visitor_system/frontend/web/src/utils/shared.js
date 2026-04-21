(function registerVisitorShared(global) {
  const STATUS_LABELS = {
    pending: "待审批",
    approved: "已通过",
    checked_in: "已签到",
    rejected: "已拒绝",
    expired: "已过期",
  };
  const DISPLAY_TIME_ZONE = global.APP_CONFIG?.displayTimeZone || "Asia/Shanghai";
  const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

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
    return STATUS_LABELS[status] || status || "-";
  }

  function parseDateTime(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = String(value).trim();
    if (!normalized) return null;

    const localMatch = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
    );
    if (localMatch) {
      const [, year, month, day, hour, minute, second = "00", millisecond = "0"] = localMatch;
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        Number(millisecond.padEnd(3, "0")),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDateTime(value) {
    if (!value) return "-";

    const date = parseDateTime(value);
    if (!date) return String(value);

    const parts = DATE_TIME_FORMATTER.formatToParts(date).reduce((result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }
      return result;
    }, {});

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }

  function normalizeDateTimeInput(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";

    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return normalized;

    const [, year, month, day, hour, minute, second = "00"] = match;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      0,
    );
    if (Number.isNaN(date.getTime())) return normalized;

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absoluteOffsetMinutes = Math.abs(offsetMinutes);
    const offsetHours = `${Math.floor(absoluteOffsetMinutes / 60)}`.padStart(2, "0");
    const offsetRemainder = `${absoluteOffsetMinutes % 60}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHours}:${offsetRemainder}`;
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
