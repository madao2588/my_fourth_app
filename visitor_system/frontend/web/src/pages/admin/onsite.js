(function registerAdminOnsitePage(global) {
  const pageRegistry = (global.AdminPages = global.AdminPages || {});
  const behaviorRegistry = (global.AdminBehaviors = global.AdminBehaviors || {});

  pageRegistry.onsite = function initAdminOnsitePage(context) {
    return {
      key: "onsite",
      sectionId: "onsite-section",
      refreshButtonIds: ["start-scan-button", "scan-check-in-button", "stop-scan-button", "inspect-scan-button"],
      mount() {
        const section = context.byId("onsite-section");
        if (section) {
          section.dataset.module = "onsite";
        }
        return section || null;
      },
    };
  };

  behaviorRegistry.onsite = function createAdminOnsiteBehavior(context) {
    const { el, deps, state } = context;

    function syncScannerSupport() {
      if (!el.scannerSupportNode) return;

      const hasCamera = Boolean(navigator.mediaDevices?.getUserMedia);
      const hasDetector = typeof window.BarcodeDetector !== "undefined";
      deps.setText(
        el.scannerSupportNode,
        hasCamera && hasDetector
          ? "当前浏览器支持原生摄像头扫码，可直接识别二维码。"
          : hasCamera
            ? "当前浏览器可打开摄像头，但缺少原生二维码识别，请继续使用手动输入。"
            : "当前浏览器不支持摄像头扫码，请使用手动输入。",
      );
    }

    async function inspectAccessCode(accessCode) {
      const code = deps.normalizeAccessCode(accessCode);
      if (!code) {
        deps.setScannerMessage("请先输入或扫描有效的入场码。");
        return null;
      }

      try {
        const record = await global.visitorApi.inspectAppointment(code);
        state.setLastScannedAccessCode(code);
        deps.renderScannedRecord(record);
        return record;
      } catch (error) {
        deps.renderScannedRecord(null);
        deps.setScannerMessage(`识别详情加载失败：${error.message}`);
        return null;
      }
    }

    async function runCheckInWithCode(accessCode, fromScan = false) {
      deps.setText(el.operationResultNode, fromScan ? "扫码成功，正在执行签到..." : "正在执行签到...");

      try {
        const record = await global.visitorApi.checkInAppointment(accessCode);
        deps.setText(el.operationResultNode, `签到成功：${record.name} 已于 ${deps.formatDateTime(record.checked_in_at)} 入场。`);
        el.checkInForm?.reset();
        if (deps.getExpireCodeInput()) deps.getExpireCodeInput().value = accessCode;
        deps.renderScannedRecord(record);
        deps.closeConfirmModal();
        await deps.refreshAdminData();
      } catch (error) {
        deps.setText(el.operationResultNode, `签到失败：${error.message}`);
      }
    }

    async function handleCheckInSubmit(event) {
      event.preventDefault();
      if (!deps.isAdminLoggedIn()) return deps.setText(el.operationResultNode, "请先登录管理员账号。");
      const accessCode = deps.normalizeAccessCode(new FormData(el.checkInForm).get("check_in_code"));
      await runCheckInWithCode(accessCode, false);
    }

    async function handleExpireSubmit(event) {
      event.preventDefault();
      if (!deps.isAdminLoggedIn()) return deps.setText(el.operationResultNode, "请先登录管理员账号。");
      const accessCode = deps.normalizeAccessCode(new FormData(el.expireForm).get("expire_code"));
      deps.setText(el.operationResultNode, "正在标记过期...");

      try {
        const record = await global.visitorApi.expireAppointment(accessCode);
        deps.setText(el.operationResultNode, `已标记过期：${record.name} 的预约已于 ${deps.formatDateTime(record.expired_at)} 过期。`);
        el.expireForm.reset();
        if (deps.getCheckInCodeInput()) deps.getCheckInCodeInput().value = accessCode;
        deps.renderScannedRecord(record);
        await deps.refreshAdminData();
      } catch (error) {
        deps.setText(el.operationResultNode, `过期操作失败：${error.message}`);
      }
    }

    async function handleInspectScannedCode() {
      if (!deps.isAdminLoggedIn()) return deps.setScannerMessage("请先登录管理员账号。");
      const code = state.getLastScannedAccessCode() || deps.getCheckInCodeInput()?.value || deps.getExpireCodeInput()?.value;
      const record = await inspectAccessCode(code);
      if (record) deps.setScannerMessage(`已刷新识别详情：${record.name} / ${deps.formatStatus(record.status)}`);
    }

    return {
      syncScannerSupport,
      inspectAccessCode,
      runCheckInWithCode,
      handleCheckInSubmit,
      handleExpireSubmit,
      handleInspectScannedCode,
    };
  };
})(window);
