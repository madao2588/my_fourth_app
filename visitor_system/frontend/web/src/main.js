const {
  byId,
  setText,
  toggleHidden,
  clearNode,
  clearValue,
  formatStatus,
  formatDateTime,
  normalizeDateTimeInput,
  normalizeAccessCode,
} = window.VisitorShared;

const adminState = window.createVisitorAdminState();

const el = {
  healthNode: byId("ping-result"),
  pingButton: byId("ping-button"),
  applyForm: byId("apply-form"),
  applyResultNode: byId("apply-result"),
  ticketCard: byId("ticket-card"),
  applicationIdNode: byId("application-id"),
  accessCodeNode: byId("access-code"),
  queryForm: byId("query-form"),
  queryCard: byId("query-card"),
  queryResultNode: byId("query-result"),
  queryNameNode: byId("query-name"),
  queryStatusNode: byId("query-status"),
  queryTimeNode: byId("query-time"),
  queryTargetNode: byId("query-target"),
  queryRemarkNode: byId("query-remark"),
  passResultNode: byId("pass-result"),
  passStatusBadge: byId("pass-status-badge"),
  visitorPassCard: byId("visitor-pass-card"),
  passApplicationIdNode: byId("pass-application-id"),
  passAccessCodeNode: byId("pass-access-code"),
  passNameNode: byId("pass-name"),
  passPhoneNode: byId("pass-phone"),
  passTargetNode: byId("pass-target"),
  passTimeNode: byId("pass-time"),
  passRemarkNode: byId("pass-remark"),
  passApprovedByNode: byId("pass-approved-by"),
  passApprovedAtNode: byId("pass-approved-at"),
  passCheckedInAtNode: byId("pass-checked-in-at"),
  passPayloadNode: byId("pass-payload"),
  copyPassPayloadButton: byId("copy-pass-payload"),
  passQrNoteNode: byId("pass-qr-note"),
  passQrWrapNode: byId("pass-qr-wrap"),
  passQrImageNode: byId("pass-qr-image"),
  openPassQrLink: byId("open-pass-qr"),
  loginForm: byId("login-form"),
  loginResultNode: byId("login-result"),
  logoutButton: byId("logout-button"),
  refreshAccountButton: byId("refresh-account-button"),
  accountCard: byId("account-card"),
  accountResultNode: byId("account-result"),
  accountUsernameNode: byId("account-username"),
  accountStatusNode: byId("account-status"),
  accountCreatedAtNode: byId("account-created-at"),
  passwordForm: byId("password-form"),
  passwordResultNode: byId("password-result"),
  refreshUsersButton: byId("refresh-users-button"),
  usersResultNode: byId("users-result"),
  usersEmptyNode: byId("users-empty"),
  usersListNode: byId("users-list"),
  refreshAdminButton: byId("refresh-admin-button"),
  adminResultNode: byId("admin-result"),
  refreshStatsButton: byId("refresh-stats-button"),
  statsResultNode: byId("stats-result"),
  statsTotalNode: byId("stats-total"),
  statsPendingNode: byId("stats-pending"),
  statsApprovedNode: byId("stats-approved"),
  statsRejectedNode: byId("stats-rejected"),
  statsExpiredNode: byId("stats-expired"),
  statsCheckedInNode: byId("stats-checked-in"),
  refreshOverviewButton: byId("refresh-overview-button"),
  overviewResultNode: byId("overview-result"),
  todayCreatedNode: byId("today-created"),
  todayPendingNode: byId("today-pending"),
  todayApprovedNode: byId("today-approved"),
  todayRejectedNode: byId("today-rejected"),
  todayCheckedInNode: byId("today-checked-in"),
  todayExpiredNode: byId("today-expired"),
  activityEmptyNode: byId("activity-empty"),
  activityListNode: byId("activity-list"),
  expireStaleButton: byId("expire-stale-button"),
  expireStaleResultNode: byId("expire-stale-result"),
  adminAuthTipNode: byId("admin-auth-tip"),
  adminEmptyNode: byId("admin-empty"),
  pendingListNode: byId("pending-list"),
  checkInForm: byId("check-in-form"),
  expireForm: byId("expire-form"),
  operationResultNode: byId("operation-result"),
  startScanButton: byId("start-scan-button"),
  scanCheckInButton: byId("scan-check-in-button"),
  stopScanButton: byId("stop-scan-button"),
  inspectScanButton: byId("inspect-scan-button"),
  scannerSupportNode: byId("scanner-support"),
  scannerPreviewNode: byId("scanner-preview"),
  scannerVideoNode: byId("scanner-video"),
  scannerResultNode: byId("scanner-result"),
  scanRecordCard: byId("scan-record-card"),
  scanRecordIdNode: byId("scan-record-id"),
  scanRecordNameNode: byId("scan-record-name"),
  scanRecordPhoneNode: byId("scan-record-phone"),
  scanRecordTargetNode: byId("scan-record-target"),
  scanRecordTimeNode: byId("scan-record-time"),
  scanRecordStatusNode: byId("scan-record-status"),
  scanRecordRemarkNode: byId("scan-record-remark"),
  scanRecordCodeNode: byId("scan-record-code"),
  scanConfirmModal: byId("scan-confirm-modal"),
  closeConfirmModalButton: byId("close-confirm-modal"),
  confirmCheckInButton: byId("confirm-check-in-button"),
  confirmModalTipNode: byId("confirm-modal-tip"),
  confirmRecordIdNode: byId("confirm-record-id"),
  confirmRecordNameNode: byId("confirm-record-name"),
  confirmRecordPhoneNode: byId("confirm-record-phone"),
  confirmRecordTargetNode: byId("confirm-record-target"),
  confirmRecordTimeNode: byId("confirm-record-time"),
  confirmRecordStatusNode: byId("confirm-record-status"),
  confirmRecordRemarkNode: byId("confirm-record-remark"),
  confirmRecordCodeNode: byId("confirm-record-code"),
  historyForm: byId("history-form"),
  refreshHistoryButton: byId("refresh-history-button"),
  historyResultNode: byId("history-result"),
  historyEmptyNode: byId("history-empty"),
  historyListNode: byId("history-list"),
  historyPageInfoNode: byId("history-page-info"),
  historyPrevButton: byId("history-prev-button"),
  historyNextButton: byId("history-next-button"),
  clearHistoryFiltersButton: byId("clear-history-filters-button"),
  logsForm: byId("logs-form"),
  refreshLogsButton: byId("refresh-logs-button"),
  logsResultNode: byId("logs-result"),
  logsEmptyNode: byId("logs-empty"),
  logsListNode: byId("logs-list"),
  logsPageInfoNode: byId("logs-page-info"),
  loadMoreLogsButton: byId("load-more-logs-button"),
};

let scannerStream = null;
let scannerFrameId = null;
let scannerDetector = null;
let scannerAutoAction = "";
let pendingConfirmRecord = null;
const HISTORY_PAGE_SIZE = 5;

const getCheckInCodeInput = () => el.checkInForm?.elements?.namedItem("check_in_code") || null;
const getExpireCodeInput = () => el.expireForm?.elements?.namedItem("expire_code") || null;
const isAdminLoggedIn = () => Boolean(window.adminSession?.getToken?.());
const setScannerMessage = (text) => setText(el.scannerResultNode, text);

function buildPassPayload(record) {
  return JSON.stringify(
    {
      application_id: record.id,
      access_code: record.access_code,
      name: record.name,
      phone: record.phone,
      target_person: record.target_person,
      appointment_time: record.appointment_time,
      status: record.status,
    },
    null,
    2,
  );
}

function buildPassQrUrl(payloadText) {
  const base = window.APP_CONFIG?.qrServiceBaseUrl;
  if (!base || !payloadText) return "";
  return `${base}?${new URLSearchParams({ size: "240x240", margin: "8", data: payloadText })}`;
}

function initAdminModules() {
  const registry = window.AdminPages || {};
  const moduleContext = { byId, elements: el };
  const keys = ["accounts", "dashboard", "pending", "onsite", "history", "logs"];
  const modules = [];

  keys.forEach((key) => {
    const createModule = registry[key];
    if (typeof createModule !== "function") return;
    const module = createModule(moduleContext);
    if (module && typeof module.mount === "function") module.mount();
    if (module) modules.push(module);
  });

  window.__visitorAdminModules = modules;
}

function initAdminBehaviors() {
  const registry = window.AdminBehaviors || {};
  const sharedDeps = {
    setText,
    toggleHidden,
    clearNode,
    clearValue,
    formatDateTime,
    formatStatus,
    isAdminLoggedIn,
    refreshAdminData,
    renderScannedRecord,
    stopScanner,
    closeConfirmModal,
    getCheckInCodeInput,
    getExpireCodeInput,
    setScannerMessage,
    clearAdminViews,
    syncAdminAuthHint,
    normalizeDateTimeInput,
    normalizeAccessCode,
    historyPageSize: HISTORY_PAGE_SIZE,
  };

  window.__visitorAdminBehaviors = {
    accounts: typeof registry.accounts === "function" ? registry.accounts({ byId, el, deps: sharedDeps, state: adminState }) : null,
    dashboard: typeof registry.dashboard === "function" ? registry.dashboard({ byId, el, deps: sharedDeps, state: adminState }) : null,
    pending: typeof registry.pending === "function" ? registry.pending({ byId, el, deps: sharedDeps, state: adminState }) : null,
    history: typeof registry.history === "function" ? registry.history({ byId, el, deps: sharedDeps, state: adminState }) : null,
    onsite: typeof registry.onsite === "function" ? registry.onsite({ byId, el, deps: sharedDeps, state: adminState }) : null,
    logs: typeof registry.logs === "function" ? registry.logs({ byId, el, deps: sharedDeps, state: adminState }) : null,
  };
}

async function refreshAdminData() {
  await Promise.all([
    loadPendingAppointments(),
    loadStats(),
    loadOverview(),
    loadHistory(readHistoryFilters()),
    loadLogs(readLogFilters()),
  ]);
}

async function handlePing() {
  if (!el.healthNode) return;
  setText(el.healthNode, "正在检查后端健康状态...");
  try {
    const payload = await window.visitorApi.healthCheck();
    setText(el.healthNode, `后端正常：应用=${payload.status}，数据库=${payload.database}`);
  } catch (error) {
    setText(el.healthNode, `后端检查失败：${error.message}`);
  }
}

function syncPassBadge(status) {
  if (!el.passStatusBadge) return;
  el.passStatusBadge.className = "status-badge";
  if (!status) {
    toggleHidden(el.passStatusBadge, true);
    return;
  }
  el.passStatusBadge.classList.add(`status-${status}`);
  setText(el.passStatusBadge, formatStatus(status));
  toggleHidden(el.passStatusBadge, false);
}

function renderVisitorPass(record) {
  if (!el.visitorPassCard) return;

  if (!record) {
    toggleHidden(el.visitorPassCard, true);
    syncPassBadge("");
    setText(el.passResultNode, "查询记录后会显示通行证信息。");
    setText(el.passPayloadNode, "");
    setText(el.passQrNoteNode, "审批通过后会显示二维码。");
    toggleHidden(el.passQrWrapNode, true);
    toggleHidden(el.openPassQrLink, true);
    el.passQrImageNode?.removeAttribute("src");
    el.openPassQrLink?.removeAttribute("href");
    return;
  }

  setText(el.passApplicationIdNode, record.id ?? "-");
  setText(el.passAccessCodeNode, record.access_code || "-");
  setText(el.passNameNode, record.name || "-");
  setText(el.passPhoneNode, record.phone || "-");
  setText(el.passTargetNode, record.target_person || "-");
  setText(el.passTimeNode, formatDateTime(record.appointment_time));
  setText(el.passRemarkNode, record.admin_remark || "-");
  setText(el.passApprovedByNode, record.approved_by || "-");
  setText(el.passApprovedAtNode, formatDateTime(record.approved_at));
  setText(el.passCheckedInAtNode, formatDateTime(record.checked_in_at));

  const payloadText = buildPassPayload(record);
  const qrUrl = buildPassQrUrl(payloadText);
  setText(el.passPayloadNode, payloadText);
  syncPassBadge(record.status);
  toggleHidden(el.visitorPassCard, false);

  const approved = record.status === "approved";
  setText(
    el.passResultNode,
    approved
      ? "已审批通过，可使用入场码或二维码核验。"
      : record.status === "pending"
        ? "当前处于待审批状态。"
        : record.status === "rejected"
          ? "预约已被拒绝，请重新提交申请。"
          : record.status === "expired"
            ? "预约已过期，请重新提交申请。"
            : "通行证信息已更新。",
  );

  setText(
    el.passQrNoteNode,
    approved ? "已生成用于现场核验的二维码。" : "未审批通过前不显示二维码。",
  );

  if (approved && qrUrl) {
    el.passQrImageNode.src = qrUrl;
    el.openPassQrLink.href = qrUrl;
  } else {
    el.passQrImageNode?.removeAttribute("src");
    el.openPassQrLink?.removeAttribute("href");
  }

  toggleHidden(el.passQrWrapNode, !(approved && qrUrl));
  toggleHidden(el.openPassQrLink, !(approved && qrUrl));
}

function renderScannedRecord(record) {
  if (!el.scanRecordCard) return;

  if (!record) {
    toggleHidden(el.scanRecordCard, true);
    [
      "scanRecordIdNode",
      "scanRecordNameNode",
      "scanRecordPhoneNode",
      "scanRecordTargetNode",
      "scanRecordTimeNode",
      "scanRecordStatusNode",
      "scanRecordRemarkNode",
      "scanRecordCodeNode",
    ].forEach((key) => setText(el[key], "-"));
    return;
  }

  setText(el.scanRecordIdNode, record.id);
  setText(el.scanRecordNameNode, record.name || "-");
  setText(el.scanRecordPhoneNode, record.phone || "-");
  setText(el.scanRecordTargetNode, record.target_person || "-");
  setText(el.scanRecordTimeNode, formatDateTime(record.appointment_time));
  setText(el.scanRecordStatusNode, formatStatus(record.status));
  setText(el.scanRecordRemarkNode, record.admin_remark || "-");
  setText(el.scanRecordCodeNode, record.access_code || "-");
  toggleHidden(el.scanRecordCard, false);
}

function renderConfirmRecord(record) {
  if (!el.scanConfirmModal) return;

  if (!record) {
    pendingConfirmRecord = null;
    [
      "confirmRecordIdNode",
      "confirmRecordNameNode",
      "confirmRecordPhoneNode",
      "confirmRecordTargetNode",
      "confirmRecordTimeNode",
      "confirmRecordStatusNode",
      "confirmRecordRemarkNode",
      "confirmRecordCodeNode",
    ].forEach((key) => setText(el[key], "-"));
    return;
  }

  pendingConfirmRecord = record;
  setText(el.confirmRecordIdNode, record.id);
  setText(el.confirmRecordNameNode, record.name || "-");
  setText(el.confirmRecordPhoneNode, record.phone || "-");
  setText(el.confirmRecordTargetNode, record.target_person || "-");
  setText(el.confirmRecordTimeNode, formatDateTime(record.appointment_time));
  setText(el.confirmRecordStatusNode, formatStatus(record.status));
  setText(el.confirmRecordRemarkNode, record.admin_remark || "-");
  setText(el.confirmRecordCodeNode, record.access_code || "-");
}

function openConfirmModal(record) {
  renderConfirmRecord(record);
  toggleHidden(el.scanConfirmModal, false);
}

function closeConfirmModal() {
  toggleHidden(el.scanConfirmModal, true);
  renderConfirmRecord(null);
}

function syncAdminAuthHint() {
  if (!el.adminAuthTipNode || !el.loginResultNode) return;
  if (isAdminLoggedIn()) {
    setText(el.adminAuthTipNode, "管理员已登录。");
    setText(el.loginResultNode, "管理员会话已生效。");
    return;
  }
  setText(el.adminAuthTipNode, "请先登录后再使用后台功能。");
  setText(el.loginResultNode, "默认管理员账号：admin / admin123456");
}

function clearAdminViews() {
  clearNode(el.pendingListNode);
  clearNode(el.historyListNode);
  clearNode(el.activityListNode);
  clearNode(el.logsListNode);
  adminState.setHistoryRecords([]);
  adminState.setHistoryTotal(0);
  adminState.setHistoryPage(1);
  toggleHidden(el.adminEmptyNode, true);
  toggleHidden(el.historyEmptyNode, true);
  toggleHidden(el.activityEmptyNode, true);
  toggleHidden(el.logsEmptyNode, true);
  toggleHidden(el.accountCard, true);
  renderScannedRecord(null);
}

async function handleApplySubmit(event) {
  event.preventDefault();
  const formData = new FormData(el.applyForm);
  const payload = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    reason: formData.get("reason"),
    target_person: formData.get("target_person"),
    appointment_time: normalizeDateTimeInput(formData.get("appointment_time")),
  };

  setText(el.applyResultNode, "正在提交预约...");
  toggleHidden(el.ticketCard, true);

  try {
    const result = await window.visitorApi.applyVisit(payload);
    setText(el.applyResultNode, "预约提交成功。");
    setText(el.applicationIdNode, result.application_id);
    setText(el.accessCodeNode, result.access_code);
    toggleHidden(el.ticketCard, false);
    renderVisitorPass({
      id: result.application_id,
      access_code: result.access_code,
      name: payload.name,
      phone: payload.phone,
      target_person: payload.target_person,
      appointment_time: payload.appointment_time,
      admin_remark: "",
      approved_by: "",
      approved_at: "",
      checked_in_at: "",
      status: "pending",
    });
    el.applyForm.reset();
  } catch (error) {
    setText(el.applyResultNode, `提交失败：${error.message}`);
  }
}

async function handleQuerySubmit(event) {
  event.preventDefault();
  const phone = new FormData(el.queryForm).get("query_phone");
  setText(el.queryResultNode, "正在查询...");
  toggleHidden(el.queryCard, true);

  try {
    const record = (await window.visitorApi.queryByPhone(phone)).record;
    setText(el.queryNameNode, record.name);
    setText(el.queryStatusNode, formatStatus(record.status));
    setText(el.queryTimeNode, formatDateTime(record.appointment_time));
    setText(el.queryTargetNode, record.target_person);
    setText(el.queryRemarkNode, record.admin_remark || "-");
    toggleHidden(el.queryCard, false);
    renderVisitorPass(record);
    setText(el.queryResultNode, "查询完成。");
  } catch (error) {
    renderVisitorPass(null);
    setText(el.queryResultNode, `查询失败：${error.message}`);
  }
}

async function inspectAccessCode(accessCode) {
  const code = normalizeAccessCode(accessCode);
  if (!code) {
    setScannerMessage("请输入有效的入场码。");
    return null;
  }

  try {
    const record = await window.visitorApi.inspectAppointment(code);
    adminState.setLastScannedAccessCode(code);
    renderScannedRecord(record);
    return record;
  } catch (error) {
    renderScannedRecord(null);
    setScannerMessage(`核验失败：${error.message}`);
    return null;
  }
}

function stopScanner() {
  if (scannerFrameId) {
    cancelAnimationFrame(scannerFrameId);
    scannerFrameId = null;
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  if (el.scannerVideoNode) {
    el.scannerVideoNode.pause();
    el.scannerVideoNode.srcObject = null;
  }
  toggleHidden(el.scannerPreviewNode, true);
}

function extractAccessCodeFromScan(rawValue) {
  const value = (rawValue || "").trim();
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.access_code === "string") return normalizeAccessCode(parsed.access_code);
  } catch (_) {
    // ignore JSON parse errors
  }

  const plainCode = normalizeAccessCode(value);
  if (/^[A-Z0-9]{6}$/.test(plainCode)) return plainCode;

  const embeddedMatch = value.match(/"access_code"\s*:\s*"([A-Za-z0-9]{6})"/);
  return embeddedMatch ? normalizeAccessCode(embeddedMatch[1]) : "";
}

function applyScannedAccessCode(code) {
  const checkInCodeInput = getCheckInCodeInput();
  const expireCodeInput = getExpireCodeInput();
  if (checkInCodeInput) checkInCodeInput.value = code;
  if (expireCodeInput) expireCodeInput.value = code;
}

async function processScanResult(rawValue) {
  const accessCode = extractAccessCodeFromScan(rawValue);
  if (!accessCode) {
    setScannerMessage("扫码结果中未识别到有效入场码。");
    return;
  }

  applyScannedAccessCode(accessCode);
  adminState.setLastScannedAccessCode(accessCode);

  const inspectedRecord = await inspectAccessCode(accessCode);
  setScannerMessage(
    inspectedRecord
      ? `已识别 ${inspectedRecord.name}，入场码 ${accessCode}。`
      : `已识别入场码 ${accessCode}。`,
  );

  stopScanner();

  if (scannerAutoAction === "check-in") {
    scannerAutoAction = "";
    if (inspectedRecord) {
      setText(el.confirmModalTipNode, "请确认预约信息后完成签到。");
      openConfirmModal(inspectedRecord);
    } else {
      setText(el.operationResultNode, "核验失败，未执行签到操作。");
    }
    return;
  }

  scannerAutoAction = "";
}

async function scanLoop() {
  if (!scannerDetector || !el.scannerVideoNode || el.scannerVideoNode.readyState < 2) {
    scannerFrameId = requestAnimationFrame(scanLoop);
    return;
  }

  try {
    const barcodes = await scannerDetector.detect(el.scannerVideoNode);
    if (barcodes.length) {
      await processScanResult(barcodes[0].rawValue || "");
      return;
    }
  } catch (error) {
    setScannerMessage(`扫码失败：${error.message}`);
    stopScanner();
    return;
  }

  scannerFrameId = requestAnimationFrame(scanLoop);
}

async function runCheckInWithCode(accessCode, fromScan = false) {
  setText(el.operationResultNode, fromScan ? "正在根据扫码结果执行签到..." : "正在执行签到...");
  try {
    const record = await window.visitorApi.checkInAppointment(accessCode);
    setText(el.operationResultNode, `签到成功：${record.name}`);
    el.checkInForm?.reset();
    if (getExpireCodeInput()) getExpireCodeInput().value = accessCode;
    renderScannedRecord(record);
    closeConfirmModal();
    await refreshAdminData();
  } catch (error) {
    setText(el.operationResultNode, `签到失败：${error.message}`);
  }
}

async function startScanner() {
  if (!isAdminLoggedIn()) {
    setScannerMessage("请先登录后台。");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setScannerMessage("当前浏览器不支持摄像头接口。");
    return;
  }
  if (typeof window.BarcodeDetector === "undefined") {
    setScannerMessage("当前浏览器不支持条码识别能力。");
    return;
  }

  try {
    scannerDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    if (!el.scannerVideoNode) throw new Error("未找到扫码视频节点。");
    el.scannerVideoNode.srcObject = scannerStream;
    await el.scannerVideoNode.play();
    toggleHidden(el.scannerPreviewNode, false);
    setScannerMessage("扫码器已启动。");
    scannerFrameId = requestAnimationFrame(scanLoop);
  } catch (error) {
    stopScanner();
    scannerAutoAction = "";
    setScannerMessage(`启动扫码器失败：${error.message}`);
  }
}

async function handleStartScan() {
  scannerAutoAction = "";
  await startScanner();
}

async function handleScanCheckIn() {
  scannerAutoAction = "check-in";
  await startScanner();
}

function handleStopScan() {
  stopScanner();
  scannerAutoAction = "";
  setScannerMessage("扫码器已停止。");
}

async function handleConfirmCheckIn() {
  if (!pendingConfirmRecord) {
    setText(el.operationResultNode, "当前没有可确认的预约记录。");
    closeConfirmModal();
    return;
  }
  await runCheckInWithCode(pendingConfirmRecord.access_code, true);
}

async function handleCopyPassPayload() {
  if (!el.passPayloadNode || !el.passPayloadNode.textContent) {
    setText(el.passResultNode, "当前没有可复制的载荷内容。");
    return;
  }
  if (!navigator.clipboard?.writeText) {
    setText(el.passResultNode, "当前浏览器不支持剪贴板接口。");
    return;
  }

  try {
    await navigator.clipboard.writeText(el.passPayloadNode.textContent);
    setText(el.passResultNode, "载荷已复制。");
  } catch (_) {
    setText(el.passResultNode, "复制失败。");
  }
}

async function loadCurrentAccount() {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.loadCurrentAccount) return behavior.loadCurrentAccount();
}

async function loadAdminUsers() {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.loadAdminUsers) return behavior.loadAdminUsers();
}

async function handleCreateAdminUser(event) {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.handleCreateAdminUser) return behavior.handleCreateAdminUser(event);
}

async function handleAdminUserStatusToggle(userId, isActive) {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.handleAdminUserStatusToggle) return behavior.handleAdminUserStatusToggle(userId, isActive);
}

async function loadStats() {
  const behavior = window.__visitorAdminBehaviors?.dashboard;
  if (behavior?.loadStats) return behavior.loadStats();
}

async function loadOverview() {
  const behavior = window.__visitorAdminBehaviors?.dashboard;
  if (behavior?.loadOverview) return behavior.loadOverview();
}

async function handleExpireStaleAppointments() {
  const behavior = window.__visitorAdminBehaviors?.dashboard;
  if (behavior?.handleExpireStaleAppointments) return behavior.handleExpireStaleAppointments();
}

async function handleLoginSubmit(event) {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.handleLoginSubmit) return behavior.handleLoginSubmit(event);
}

async function handlePasswordSubmit(event) {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.handlePasswordSubmit) return behavior.handlePasswordSubmit(event);
}

function handleLogout() {
  const behavior = window.__visitorAdminBehaviors?.accounts;
  if (behavior?.handleLogout) return behavior.handleLogout();
}

async function loadPendingAppointments() {
  const behavior = window.__visitorAdminBehaviors?.pending;
  if (behavior?.loadPendingAppointments) return behavior.loadPendingAppointments();
}

async function handleAudit(recordId, action, remark) {
  const behavior = window.__visitorAdminBehaviors?.pending;
  if (behavior?.handleAudit) return behavior.handleAudit(recordId, action, remark);
}

function readHistoryFilters() {
  const behavior = window.__visitorAdminBehaviors?.history;
  if (behavior?.readHistoryFilters) return behavior.readHistoryFilters();
  return {};
}

async function loadHistory(filters = {}) {
  const behavior = window.__visitorAdminBehaviors?.history;
  if (behavior?.loadHistory) return behavior.loadHistory(filters);
}

async function handleHistorySubmit(event) {
  const behavior = window.__visitorAdminBehaviors?.history;
  if (behavior?.handleHistorySubmit) return behavior.handleHistorySubmit(event);
}

async function handleClearHistoryFilters() {
  const behavior = window.__visitorAdminBehaviors?.history;
  if (behavior?.handleClearHistoryFilters) return behavior.handleClearHistoryFilters();
}

async function goToPrevHistoryPage() {
  const behavior = window.__visitorAdminBehaviors?.history;
  if (behavior?.goToPrevHistoryPage) return behavior.goToPrevHistoryPage();
}

async function goToNextHistoryPage() {
  const behavior = window.__visitorAdminBehaviors?.history;
  if (behavior?.goToNextHistoryPage) return behavior.goToNextHistoryPage();
}

function readLogFilters() {
  const behavior = window.__visitorAdminBehaviors?.logs;
  if (behavior?.readLogFilters) return behavior.readLogFilters();
  return {};
}

async function loadLogs(filters = {}) {
  const behavior = window.__visitorAdminBehaviors?.logs;
  if (behavior?.loadLogs) return behavior.loadLogs(filters);
}

async function handleLogsSubmit(event) {
  const behavior = window.__visitorAdminBehaviors?.logs;
  if (behavior?.handleLogsSubmit) return behavior.handleLogsSubmit(event);
}

async function handleLoadMoreLogs() {
  const behavior = window.__visitorAdminBehaviors?.logs;
  if (behavior?.handleLoadMoreLogs) return behavior.handleLoadMoreLogs();
}

function syncScannerSupport() {
  const behavior = window.__visitorAdminBehaviors?.onsite;
  if (behavior?.syncScannerSupport) return behavior.syncScannerSupport();
}

async function handleCheckInSubmit(event) {
  const behavior = window.__visitorAdminBehaviors?.onsite;
  if (behavior?.handleCheckInSubmit) return behavior.handleCheckInSubmit(event);
}

async function handleExpireSubmit(event) {
  const behavior = window.__visitorAdminBehaviors?.onsite;
  if (behavior?.handleExpireSubmit) return behavior.handleExpireSubmit(event);
}

async function handleInspectScannedCode() {
  const behavior = window.__visitorAdminBehaviors?.onsite;
  if (behavior?.handleInspectScannedCode) return behavior.handleInspectScannedCode();
}

if (el.pingButton) el.pingButton.addEventListener("click", handlePing);
if (el.applyForm) el.applyForm.addEventListener("submit", handleApplySubmit);
if (el.queryForm) el.queryForm.addEventListener("submit", handleQuerySubmit);
if (el.copyPassPayloadButton) el.copyPassPayloadButton.addEventListener("click", handleCopyPassPayload);
if (el.refreshAdminButton) el.refreshAdminButton.addEventListener("click", loadPendingAppointments);
if (el.refreshStatsButton) el.refreshStatsButton.addEventListener("click", loadStats);
if (el.refreshOverviewButton) el.refreshOverviewButton.addEventListener("click", loadOverview);
if (el.expireStaleButton) el.expireStaleButton.addEventListener("click", handleExpireStaleAppointments);
if (el.startScanButton) el.startScanButton.addEventListener("click", handleStartScan);
if (el.scanCheckInButton) el.scanCheckInButton.addEventListener("click", handleScanCheckIn);
if (el.stopScanButton) el.stopScanButton.addEventListener("click", handleStopScan);
if (el.inspectScanButton) el.inspectScanButton.addEventListener("click", handleInspectScannedCode);
if (el.closeConfirmModalButton) el.closeConfirmModalButton.addEventListener("click", closeConfirmModal);
if (el.confirmCheckInButton) el.confirmCheckInButton.addEventListener("click", handleConfirmCheckIn);
if (el.checkInForm) el.checkInForm.addEventListener("submit", handleCheckInSubmit);
if (el.expireForm) el.expireForm.addEventListener("submit", handleExpireSubmit);
if (el.loginForm) el.loginForm.addEventListener("submit", handleLoginSubmit);
if (el.logoutButton) el.logoutButton.addEventListener("click", handleLogout);
if (el.refreshAccountButton) el.refreshAccountButton.addEventListener("click", loadCurrentAccount);
if (el.refreshUsersButton) el.refreshUsersButton.addEventListener("click", loadAdminUsers);
if (el.passwordForm) el.passwordForm.addEventListener("submit", handlePasswordSubmit);
if (el.historyForm) el.historyForm.addEventListener("submit", handleHistorySubmit);
if (el.clearHistoryFiltersButton) el.clearHistoryFiltersButton.addEventListener("click", handleClearHistoryFilters);
if (el.logsForm) el.logsForm.addEventListener("submit", handleLogsSubmit);
if (el.refreshHistoryButton) el.refreshHistoryButton.addEventListener("click", async () => loadHistory(readHistoryFilters()));
if (el.refreshLogsButton) el.refreshLogsButton.addEventListener("click", async () => loadLogs(readLogFilters()));
if (el.loadMoreLogsButton) el.loadMoreLogsButton.addEventListener("click", handleLoadMoreLogs);
if (el.historyPrevButton) el.historyPrevButton.addEventListener("click", goToPrevHistoryPage);
if (el.historyNextButton) el.historyNextButton.addEventListener("click", goToNextHistoryPage);

initAdminModules();
initAdminBehaviors();
renderVisitorPass(null);
syncScannerSupport();
syncAdminAuthHint();
loadCurrentAccount();
loadAdminUsers();
loadStats();
loadOverview();
loadPendingAppointments();
loadHistory();
loadLogs();

window.addEventListener("beforeunload", () => {
  stopScanner();
  closeConfirmModal();
});
