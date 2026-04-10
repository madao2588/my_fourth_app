function formatStatus(status) {
  const statusMap = {
    pending: "待审批",
    approved: "已通过",
    rejected: "已拒绝",
    expired: "已过期",
  };

  return statusMap[status] || "未知状态";
}

function getStatusTone(status) {
  const toneMap = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    expired: "expired",
  };

  return toneMap[status] || "default";
}

function getStatusNote(status) {
  const noteMap = {
    pending: "预约已提交，正在等待管理员审批。",
    approved: "预约已通过，请凭二维码或入场码到场。",
    rejected: "预约未通过，请根据备注调整后重新提交。",
    expired: "预约已过期，如仍需来访请重新申请。",
  };

  return noteMap[status] || "当前状态已更新。";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const normalized = String(value).replace("T", " ");
  return normalized.replace(".000Z", "");
}

function normalizeAppointmentTimeInput(value) {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

module.exports = {
  formatDateTime,
  formatStatus,
  getStatusNote,
  getStatusTone,
  normalizeAppointmentTimeInput,
};
