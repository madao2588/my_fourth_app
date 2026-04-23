const { queryByPhone } = require("../../services/api");
const {
  formatDateTime,
  formatStatus,
  getStatusNote,
  getStatusTone,
} = require("../../utils/format");
const { getLastPhone, setLastPhone } = require("../../utils/storage");
const app = getApp();

function buildPayload(record) {
  return JSON.stringify(
    {
      application_id: record.id,
      access_code: record.access_code,
      name: record.name,
      phone: record.phone,
      region: record.region,
      target_person: record.target_person,
      appointment_time: record.appointment_time,
      status: record.status,
    },
    null,
    2,
  );
}

function buildQrUrl(payloadText) {
  const baseUrl = app.globalData.qrServiceBaseUrl;
  if (!baseUrl || !payloadText) {
    return "";
  }

  const encodedData = encodeURIComponent(payloadText);
  return `${baseUrl}?size=240x240&margin=8&data=${encodedData}`;
}

Page({
  data: {
    phone: "",
    loading: false,
    record: null,
    payloadText: "",
    qrUrl: "",
    qrNote: "审批通过后会生成二维码预览，方便门岗扫码核验。",
  },

  onLoad(query) {
    const phone = query.phone || getLastPhone() || "";
    this.setData({ phone });

    if (phone) {
      this.loadPass(phone);
    }
  },

  onPullDownRefresh() {
    const { phone } = this.data;
    if (!phone) {
      wx.stopPullDownRefresh();
      return;
    }

    this.loadPass(phone).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadPass(phone) {
    this.setData({ loading: true });

    try {
      const payload = await queryByPhone(phone);
      const record = payload.record;
      const payloadText = buildPayload(record);
      const approved = record.status === "approved";
      setLastPhone(phone);

      this.setData({
        record: {
          ...record,
          statusText: formatStatus(record.status),
          statusTone: getStatusTone(record.status),
          statusNote: getStatusNote(record.status),
          appointmentTimeText: formatDateTime(record.appointment_time),
          regionText: record.region || "未填写",
          approvedAtText: formatDateTime(record.approved_at),
          checkedInAtText: formatDateTime(record.checked_in_at),
          remarkText: record.admin_remark || "无",
          approvedByText: record.approved_by || "未审批",
        },
        payloadText,
        qrUrl: approved ? buildQrUrl(payloadText) : "",
        qrNote: approved
          ? "二维码已生成，门岗可直接扫码读取核验内容。"
          : getStatusNote(record.status),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "未获取到凭证信息",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleRefresh() {
    const { phone } = this.data;
    if (!phone) {
      wx.showToast({
        title: "缺少手机号",
        icon: "none",
      });
      return;
    }

    await this.loadPass(phone);
  },

  handleCopyPayload() {
    const { payloadText } = this.data;
    if (!payloadText) {
      wx.showToast({
        title: "当前没有可复制内容",
        icon: "none",
      });
      return;
    }

    wx.setClipboardData({
      data: payloadText,
    });
  },

  handleCopyAccessCode() {
    const { record } = this.data;
    if (!record || !record.access_code) {
      wx.showToast({
        title: "当前没有可复制的入场码",
        icon: "none",
      });
      return;
    }

    wx.setClipboardData({
      data: record.access_code,
    });
  },

  handlePreviewQr() {
    const { qrUrl } = this.data;
    if (!qrUrl) {
      wx.showToast({
        title: "当前没有可预览二维码",
        icon: "none",
      });
      return;
    }

    wx.previewImage({
      urls: [qrUrl],
      current: qrUrl,
    });
  },

  openQueryPage() {
    const { phone } = this.data;
    wx.navigateTo({
      url: `/pages/query/index${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`,
    });
  },

  openHomePage() {
    wx.navigateTo({
      url: "/pages/home/index",
    });
  },
});
