const LAST_PHONE_KEY = "visitor_last_phone";

function getLastPhone() {
  try {
    return wx.getStorageSync(LAST_PHONE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function setLastPhone(phone) {
  const value = String(phone || "").trim();
  if (!value) {
    return;
  }

  try {
    wx.setStorageSync(LAST_PHONE_KEY, value);
  } catch (error) {
    // Ignore storage failures in prototype mode.
  }
}

module.exports = {
  getLastPhone,
  setLastPhone,
};
