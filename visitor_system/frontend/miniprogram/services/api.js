const app = getApp();

function request({ url, method = "GET", data }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${url}`,
      method,
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        const detail =
          (res.data && (res.data.detail || res.data.message)) || `HTTP ${res.statusCode}`;
        reject(new Error(detail));
      },
      fail: reject,
    });
  });
}

module.exports = {
  request,
  applyVisit(data) {
    return request({
      url: "/api/v1/apply",
      method: "POST",
      data,
    });
  },
  queryByPhone(phone) {
    return request({
      url: `/api/v1/query/${encodeURIComponent(phone)}`,
    });
  },
};
