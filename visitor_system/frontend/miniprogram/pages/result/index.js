const { setLastPhone } = require("../../utils/storage");

Page({
  data: {
    applicationId: "",
    accessCode: "",
    phone: "",
  },

  onLoad(query) {
    const phone = query.phone || "";
    if (phone) {
      setLastPhone(phone);
    }

    this.setData({
      applicationId: query.applicationId || "",
      accessCode: query.accessCode || "",
      phone,
    });
  },

  handleCopyCode() {
    const { accessCode } = this.data;
    if (!accessCode) {
      wx.showToast({
        title: "当前没有可复制的入场码",
        icon: "none",
      });
      return;
    }

    wx.setClipboardData({
      data: accessCode,
    });
  },

  openPassPage() {
    const { phone } = this.data;
    if (!phone) {
      return;
    }

    wx.navigateTo({
      url: `/pages/pass/index?phone=${encodeURIComponent(phone)}`,
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
