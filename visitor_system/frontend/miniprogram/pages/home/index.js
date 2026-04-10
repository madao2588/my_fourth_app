const { getLastPhone } = require("../../utils/storage");

Page({
  data: {
    title: "访客预约",
    actions: [
      { key: "apply", label: "我要预约", path: "/pages/apply/index" },
      { key: "query", label: "查询进度", path: "/pages/query/index" },
    ],
    recentPhone: "",
  },

  onShow() {
    this.setData({
      recentPhone: getLastPhone(),
    });
  },

  handleNavigate(event) {
    const { path } = event.currentTarget.dataset;
    if (!path) return;
    wx.navigateTo({ url: path });
  },

  handleQuickQuery() {
    const { recentPhone } = this.data;
    if (!recentPhone) {
      wx.showToast({
        title: "暂无最近查询号码",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/query/index?phone=${encodeURIComponent(recentPhone)}`,
    });
  },
});
