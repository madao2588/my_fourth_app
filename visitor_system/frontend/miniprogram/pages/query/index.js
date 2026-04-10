const { queryByPhone } = require("../../services/api");
const {
  formatDateTime,
  formatStatus,
  getStatusNote,
  getStatusTone,
} = require("../../utils/format");
const { getLastPhone, setLastPhone } = require("../../utils/storage");

Page({
  data: {
    phone: "",
    result: null,
    querying: false,
  },

  onLoad(query) {
    const phone = query.phone || getLastPhone();
    if (phone) {
      this.setData({ phone });
      this.handleQuery();
    }
  },

  onPullDownRefresh() {
    if (!this.data.phone) {
      wx.stopPullDownRefresh();
      return;
    }

    this.handleQuery().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  handleInput(event) {
    this.setData({
      phone: event.detail.value,
    });
  },

  async handleQuery() {
    const { phone } = this.data;

    if (!phone) {
      wx.showToast({
        title: "请输入手机号",
        icon: "none",
      });
      return;
    }

    this.setData({
      querying: true,
      result: null,
    });

    try {
      const payload = await queryByPhone(phone);
      const record = payload.record;
      setLastPhone(phone);
      this.setData({
        result: {
          ...record,
          statusText: formatStatus(record.status),
          statusTone: getStatusTone(record.status),
          statusNote: getStatusNote(record.status),
          appointmentTimeText: formatDateTime(record.appointment_time),
          approvedAtText: formatDateTime(record.approved_at),
          checkedInAtText: formatDateTime(record.checked_in_at),
          adminRemarkText: record.admin_remark || "无",
          approvedByText: record.approved_by || "未审批",
        },
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "未查询到记录",
        icon: "none",
      });
    } finally {
      this.setData({ querying: false });
    }
  },

  handleCopyCode() {
    const { result } = this.data;
    if (!result || !result.access_code) {
      wx.showToast({
        title: "当前没有可复制的入场码",
        icon: "none",
      });
      return;
    }

    wx.setClipboardData({
      data: result.access_code,
    });
  },

  openPassPage() {
    const { result } = this.data;
    if (!result) {
      return;
    }

    wx.navigateTo({
      url: `/pages/pass/index?phone=${encodeURIComponent(result.phone)}`,
    });
  },

  openApplyPage() {
    wx.navigateTo({
      url: "/pages/apply/index",
    });
  },

  openHomePage() {
    wx.navigateTo({
      url: "/pages/home/index",
    });
  },
});
