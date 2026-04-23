(function registerVisitorPassPage(global) {
  const runtime = global.VisitorRuntime;
  if (!runtime) {
    throw new Error("VisitorRuntime is not available.");
  }
  const behaviorRegistry = runtime.getRegistry("visitorBehaviors");

  behaviorRegistry.pass = function createVisitorPassBehavior(context) {
    const { el, deps } = context;

    function buildPassPayload(record) {
      return JSON.stringify(
        {
          access_code: record.access_code,
          region: record.region || "",
        },
        null,
        2,
      );
    }

    function buildPassQrUrl(accessCode) {
      const base = global.APP_CONFIG?.apiBaseUrl;
      const normalizedAccessCode = deps.normalizeAccessCode(accessCode);
      if (!base || !normalizedAccessCode) return "";
      return `${base}/api/v1/pass-qr/${encodeURIComponent(normalizedAccessCode)}`;
    }

    function syncPassBadge(status) {
      if (!el.passStatusBadge) return;

      el.passStatusBadge.className = "status-badge";
      if (!status) {
        deps.toggleHidden(el.passStatusBadge, true);
        return;
      }

      el.passStatusBadge.classList.add(`status-${status}`);
      deps.setText(el.passStatusBadge, deps.formatStatus(status));
      deps.toggleHidden(el.passStatusBadge, false);
    }

    function renderVisitorPass(record) {
      if (!el.visitorPassCard) return;

      if (!record) {
        deps.toggleHidden(el.visitorPassCard, true);
        syncPassBadge("");
        deps.setText(el.passResultNode, "查询记录后会显示通行证信息。");
        deps.setText(el.passPayloadNode, "");
        deps.setText(el.passQrNoteNode, "审批通过后会显示二维码。");
        deps.toggleHidden(el.passQrWrapNode, true);
        deps.toggleHidden(el.openPassQrLink, true);
        el.passQrImageNode?.removeAttribute("src");
        el.openPassQrLink?.removeAttribute("href");
        return;
      }

      deps.setText(el.passApplicationIdNode, record.id ?? "-");
      deps.setText(el.passAccessCodeNode, record.access_code || "-");
      deps.setText(el.passNameNode, record.name || "-");
      deps.setText(el.passPhoneNode, record.phone || "-");
      deps.setText(el.passRegionNode, record.region || "-");
      deps.setText(el.passTargetNode, record.target_person || "-");
      deps.setText(el.passTimeNode, deps.formatDateTime(record.appointment_time));
      deps.setText(el.passRemarkNode, record.admin_remark || "-");
      deps.setText(el.passApprovedByNode, record.approved_by || "-");
      deps.setText(el.passApprovedAtNode, deps.formatDateTime(record.approved_at));
      deps.setText(el.passCheckedInAtNode, deps.formatDateTime(record.checked_in_at));

      const payloadText = buildPassPayload(record);
      const qrUrl = buildPassQrUrl(record.access_code);
      const approved = record.status === "approved";
      const checkedIn = record.status === "checked_in";

      deps.setText(el.passPayloadNode, payloadText);
      syncPassBadge(record.status);
      deps.toggleHidden(el.visitorPassCard, false);
      deps.setText(
        el.passResultNode,
        approved
          ? "已审批通过，可使用入场码或二维码核验。"
          : checkedIn
            ? "该预约已完成签到，可在历史记录中查看详情。"
            : record.status === "pending"
              ? "当前处于待审批状态。"
              : record.status === "rejected"
                ? "预约已被拒绝，请重新提交申请。"
                : record.status === "expired"
                  ? "预约已过期，请重新提交申请。"
                  : "通行证信息已更新。",
      );

      deps.setText(
        el.passQrNoteNode,
        approved
          ? "已生成本地二维码，二维码中仅包含入场码。"
          : checkedIn
            ? "该预约已完成签到，不再展示可用于入场的二维码。"
            : "未审批通过前不显示二维码。",
      );

      if (approved && qrUrl) {
        el.passQrImageNode.src = qrUrl;
        el.openPassQrLink.href = qrUrl;
      } else {
        el.passQrImageNode?.removeAttribute("src");
        el.openPassQrLink?.removeAttribute("href");
      }

      deps.toggleHidden(el.passQrWrapNode, !(approved && qrUrl));
      deps.toggleHidden(el.openPassQrLink, !(approved && qrUrl));
    }

    async function handleCopyPassPayload() {
      if (!el.passPayloadNode || !el.passPayloadNode.textContent) {
        deps.setText(el.passResultNode, "当前没有可复制的载荷内容。");
        return;
      }
      if (!navigator.clipboard?.writeText) {
        deps.setText(el.passResultNode, "当前浏览器不支持剪贴板接口。");
        return;
      }

      try {
        await navigator.clipboard.writeText(el.passPayloadNode.textContent);
        deps.setText(el.passResultNode, "载荷已复制。");
      } catch (_) {
        deps.setText(el.passResultNode, "复制失败。");
      }
    }

    return {
      renderVisitorPass,
      handleCopyPassPayload,
    };
  };
})(window);
