const { applyVisit } = require("../../services/api");
const { normalizeAppointmentTimeInput } = require("../../utils/format");
const { getLastPhone, setLastPhone } = require("../../utils/storage");

function getDefaultAppointmentSlot() {
  const now = new Date();
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  const minutes = next.getMinutes();
  const roundedMinutes = minutes <= 30 ? 30 : 0;
  if (roundedMinutes === 0) {
    next.setHours(next.getHours() + 1);
  }
  next.setMinutes(roundedMinutes, 0, 0);

  const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  const time = `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

Page({
  data: {
    submitting: false,
    dateStart: "2024-01-01",
    dateEnd: "2035-12-31",
    form: {
      name: "",
      phone: "",
      region: "",
      reason: "",
      target_person: "",
      appointment_date: "",
      appointment_clock: "",
    },
  },

  onLoad() {
    const recentPhone = getLastPhone();
    const defaults = getDefaultAppointmentSlot();
    if (!recentPhone) {
      this.setData({
        "form.appointment_date": defaults.date,
        "form.appointment_clock": defaults.time,
      });
      return;
    }

    this.setData({
      "form.phone": recentPhone,
      "form.appointment_date": defaults.date,
      "form.appointment_clock": defaults.time,
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
    });
  },

  handleDateChange(event) {
    this.setData({
      "form.appointment_date": event.detail.value,
    });
  },

  handleTimeChange(event) {
    this.setData({
      "form.appointment_clock": event.detail.value,
    });
  },

  async handleSubmit() {
    const { form } = this.data;
    const missingField = Object.values(form).some((value) => !value);

    if (missingField) {
      wx.showToast({
        title: "请填写完整信息",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const appointmentTime = normalizeAppointmentTimeInput(
        `${form.appointment_date} ${form.appointment_clock}`,
      );
      if (!appointmentTime) {
        wx.showToast({
          title: "预约时间格式不正确",
          icon: "none",
        });
        return;
      }

      const result = await applyVisit({
        name: form.name,
        phone: form.phone,
        region: form.region,
        reason: form.reason,
        target_person: form.target_person,
        appointment_time: appointmentTime,
      });
      setLastPhone(form.phone);
      wx.navigateTo({
        url: `/pages/result/index?applicationId=${result.application_id}&accessCode=${result.access_code}&phone=${encodeURIComponent(form.phone)}`,
      });
    } catch (error) {
      wx.showToast({
        title: "提交失败，请稍后重试",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
