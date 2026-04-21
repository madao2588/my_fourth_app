(function registerAdminOnsitePage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const pageRegistry = runtime.getRegistry("adminPages");
  const behaviorRegistry = runtime.getRegistry("adminBehaviors");

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
    const { el, deps, state, services } = context;
    const { visitorApi } = services;
    const onsiteState = state.onsite;

    let scannerStream = null;
    let scannerFrameId = null;
    let scannerDetector = null;
    let scannerAutoAction = "";
    let pendingConfirmRecord = null;

    function renderScannedRecord(record) {
      if (!el.scanRecordCard) return;

      if (!record) {
        deps.toggleHidden(el.scanRecordCard, true);
        [
          "scanRecordIdNode",
          "scanRecordNameNode",
          "scanRecordPhoneNode",
          "scanRecordTargetNode",
          "scanRecordTimeNode",
          "scanRecordStatusNode",
          "scanRecordRemarkNode",
          "scanRecordCodeNode",
        ].forEach((key) => deps.setText(el[key], "-"));
        return;
      }

      deps.setText(el.scanRecordIdNode, record.id);
      deps.setText(el.scanRecordNameNode, record.name || "-");
      deps.setText(el.scanRecordPhoneNode, record.phone || "-");
      deps.setText(el.scanRecordTargetNode, record.target_person || "-");
      deps.setText(el.scanRecordTimeNode, deps.formatDateTime(record.appointment_time));
      deps.setText(el.scanRecordStatusNode, deps.formatStatus(record.status));
      deps.setText(el.scanRecordRemarkNode, record.admin_remark || "-");
      deps.setText(el.scanRecordCodeNode, record.access_code || "-");
      deps.toggleHidden(el.scanRecordCard, false);
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
        ].forEach((key) => deps.setText(el[key], "-"));
        return;
      }

      pendingConfirmRecord = record;
      deps.setText(el.confirmRecordIdNode, record.id);
      deps.setText(el.confirmRecordNameNode, record.name || "-");
      deps.setText(el.confirmRecordPhoneNode, record.phone || "-");
      deps.setText(el.confirmRecordTargetNode, record.target_person || "-");
      deps.setText(el.confirmRecordTimeNode, deps.formatDateTime(record.appointment_time));
      deps.setText(el.confirmRecordStatusNode, deps.formatStatus(record.status));
      deps.setText(el.confirmRecordRemarkNode, record.admin_remark || "-");
      deps.setText(el.confirmRecordCodeNode, record.access_code || "-");
    }

    function openConfirmModal(record) {
      renderConfirmRecord(record);
      deps.toggleHidden(el.scanConfirmModal, false);
    }

    function closeConfirmModal() {
      deps.toggleHidden(el.scanConfirmModal, true);
      renderConfirmRecord(null);
    }

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
        deps.setScannerMessage("请输入或扫描有效的入场码。");
        return null;
      }

      try {
        const record = await visitorApi.inspectAppointment(code);
        onsiteState.setLastScannedAccessCode(code);
        renderScannedRecord(record);
        return record;
      } catch (error) {
        renderScannedRecord(null);
        deps.setScannerMessage(`核验失败：${error.message}`);
        return null;
      }
    }

    async function runCheckInWithCode(accessCode, fromScan = false) {
      deps.setText(
        el.operationResultNode,
        fromScan ? "扫码成功，正在执行签到..." : "正在执行签到...",
      );

      try {
        const record = await visitorApi.checkInAppointment(accessCode);
        deps.setText(
          el.operationResultNode,
          `签到成功：${record.name} 已于 ${deps.formatDateTime(record.checked_in_at)} 入场。`,
        );
        el.checkInForm?.reset();
        if (deps.getExpireCodeInput()) deps.getExpireCodeInput().value = accessCode;
        renderScannedRecord(record);
        closeConfirmModal();
        await deps.refreshAdminData();
      } catch (error) {
        deps.setText(el.operationResultNode, `签到失败：${error.message}`);
      }
    }

    async function handleCheckInSubmit(event) {
      event.preventDefault();
      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.operationResultNode, "请先登录管理员账号。");
        return;
      }

      const accessCode = deps.normalizeAccessCode(new FormData(el.checkInForm).get("check_in_code"));
      await runCheckInWithCode(accessCode, false);
    }

    async function handleExpireSubmit(event) {
      event.preventDefault();
      if (!deps.isAdminLoggedIn()) {
        deps.setText(el.operationResultNode, "请先登录管理员账号。");
        return;
      }

      const accessCode = deps.normalizeAccessCode(new FormData(el.expireForm).get("expire_code"));
      deps.setText(el.operationResultNode, "正在标记过期...");

      try {
        const record = await visitorApi.expireAppointment(accessCode);
        deps.setText(
          el.operationResultNode,
          `已标记过期：${record.name} 的预约已于 ${deps.formatDateTime(record.expired_at)} 过期。`,
        );
        el.expireForm.reset();
        if (deps.getCheckInCodeInput()) deps.getCheckInCodeInput().value = accessCode;
        renderScannedRecord(record);
        await deps.refreshAdminData();
      } catch (error) {
        deps.setText(el.operationResultNode, `过期操作失败：${error.message}`);
      }
    }

    async function handleInspectScannedCode() {
      if (!deps.isAdminLoggedIn()) {
        deps.setScannerMessage("请先登录管理员账号。");
        return;
      }

      const code =
        onsiteState.getLastScannedAccessCode() ||
        deps.getCheckInCodeInput()?.value ||
        deps.getExpireCodeInput()?.value;
      const record = await inspectAccessCode(code);
      if (record) {
        deps.setScannerMessage(`已刷新识别详情：${record.name} / ${deps.formatStatus(record.status)}`);
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
      deps.toggleHidden(el.scannerPreviewNode, true);
    }

    function extractAccessCodeFromScan(rawValue) {
      const value = (rawValue || "").trim();
      if (!value) return "";

      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed.access_code === "string") {
          return deps.normalizeAccessCode(parsed.access_code);
        }
      } catch (_) {
        // ignore JSON parse errors
      }

      const plainCode = deps.normalizeAccessCode(value);
      if (/^[A-Z0-9]{6}$/.test(plainCode)) return plainCode;

      const embeddedMatch = value.match(/"access_code"\s*:\s*"([A-Za-z0-9]{6})"/);
      return embeddedMatch ? deps.normalizeAccessCode(embeddedMatch[1]) : "";
    }

    function applyScannedAccessCode(code) {
      const checkInCodeInput = deps.getCheckInCodeInput();
      const expireCodeInput = deps.getExpireCodeInput();
      if (checkInCodeInput) checkInCodeInput.value = code;
      if (expireCodeInput) expireCodeInput.value = code;
    }

    async function processScanResult(rawValue) {
      const accessCode = extractAccessCodeFromScan(rawValue);
      if (!accessCode) {
        deps.setScannerMessage("扫码结果中未识别到有效入场码。");
        return;
      }

      applyScannedAccessCode(accessCode);
      onsiteState.setLastScannedAccessCode(accessCode);

      const inspectedRecord = await inspectAccessCode(accessCode);
      deps.setScannerMessage(
        inspectedRecord
          ? `已识别 ${inspectedRecord.name}，入场码 ${accessCode}。`
          : `已识别入场码 ${accessCode}。`,
      );

      stopScanner();

      if (scannerAutoAction === "check-in") {
        scannerAutoAction = "";
        if (inspectedRecord) {
          deps.setText(el.confirmModalTipNode, "请确认预约信息后完成签到。");
          openConfirmModal(inspectedRecord);
        } else {
          deps.setText(el.operationResultNode, "核验失败，未执行签到操作。");
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
        deps.setScannerMessage(`扫码失败：${error.message}`);
        stopScanner();
        return;
      }

      scannerFrameId = requestAnimationFrame(scanLoop);
    }

    async function startScanner() {
      if (!deps.isAdminLoggedIn()) {
        deps.setScannerMessage("请先登录后台。");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        deps.setScannerMessage("当前浏览器不支持摄像头接口。");
        return;
      }
      if (typeof window.BarcodeDetector === "undefined") {
        deps.setScannerMessage("当前浏览器不支持条码识别能力。");
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
        deps.toggleHidden(el.scannerPreviewNode, false);
        deps.setScannerMessage("扫码器已启动。");
        scannerFrameId = requestAnimationFrame(scanLoop);
      } catch (error) {
        stopScanner();
        scannerAutoAction = "";
        deps.setScannerMessage(`启动扫码器失败：${error.message}`);
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
      deps.setScannerMessage("扫码器已停止。");
    }

    async function handleConfirmCheckIn() {
      if (!pendingConfirmRecord) {
        deps.setText(el.operationResultNode, "当前没有可确认的预约记录。");
        closeConfirmModal();
        return;
      }

      await runCheckInWithCode(pendingConfirmRecord.access_code, true);
    }

    return {
      renderScannedRecord,
      openConfirmModal,
      closeConfirmModal,
      syncScannerSupport,
      inspectAccessCode,
      runCheckInWithCode,
      handleCheckInSubmit,
      handleExpireSubmit,
      handleInspectScannedCode,
      stopScanner,
      handleStartScan,
      handleScanCheckIn,
      handleStopScan,
      handleConfirmCheckIn,
    };
  };
})(window);
