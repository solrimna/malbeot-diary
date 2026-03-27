// 담당: 김정원 - 알람 및 Web Push 관련 기능

function populateAlarmTimeSelects() {
  const hourSelect = document.getElementById("alarm-hour");
  const minuteSelect = document.getElementById("alarm-minute");
  if (!hourSelect || !minuteSelect) return;

  if (!hourSelect.options.length) {
    for (let h = 1; h <= 12; h++) {
      const opt = document.createElement("option");
      opt.value = String(h);
      opt.textContent = `${h}시`;
      hourSelect.appendChild(opt);
    }
  }

  if (!minuteSelect.options.length) {
    for (let m = 0; m <= 59; m++) {
      const opt = document.createElement("option");
      opt.value = String(m).padStart(2, "0");
      opt.textContent = `${String(m).padStart(2, "0")}분`;
      minuteSelect.appendChild(opt);
    }
  }

  initCustomSelect(document.getElementById("alarm-ampm"));
  initCustomSelect(hourSelect);
  initCustomSelect(minuteSelect);
}

function getAlarmTimeValue() {
  const ampm = document.getElementById("alarm-ampm")?.value;
  const hourRaw = parseInt(document.getElementById("alarm-hour")?.value || "0", 10);
  const minute = document.getElementById("alarm-minute")?.value || "00";

  if (!ampm || !hourRaw) return null;

  let hour24 = hourRaw;
  if (ampm === "AM" && hourRaw === 12) hour24 = 0;
  else if (ampm === "PM" && hourRaw !== 12) hour24 = hourRaw + 12;

  return `${String(hour24).padStart(2, "0")}:${minute}:00`;
}

function setAlarmTimeSelects(timeStr) {
  const [hhStr, mmStr] = timeStr.split(":");
  const hh = parseInt(hhStr, 10);

  const ampm = hh < 12 ? "AM" : "PM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;

  const ampmSelect = document.getElementById("alarm-ampm");
  const hourSelect = document.getElementById("alarm-hour");
  const minuteSelect = document.getElementById("alarm-minute");

  if (ampmSelect) ampmSelect.value = ampm;
  if (hourSelect) hourSelect.value = String(hour12);
  if (minuteSelect) minuteSelect.value = mmStr.slice(0, 2);
}

const DAY_KOR = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
  SAT: "토요일",
  SUN: "일요일",
};

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function formatDaysKorean(repeatDaysStr) {
  if (!repeatDaysStr) return "-";
  const days = repeatDaysStr.split(",").map((d) => d.trim());
  if (days.length === 7) return "매일";
  return days.map((d) => DAY_KOR[d] || d).join(", ");
}

function getAccessToken() {
  const inputEl = document.getElementById("token-input");
  if (inputEl && inputEl.value.trim()) {
    return inputEl.value.trim();
  }
  return localStorage.getItem("access_token");
}

function showAlarmToast(message, type = "info", title = "Alarm") {
  if (typeof window.showAppToast === "function") {
    window.showAppToast(message, type, title);
    return;
  }

  const container = document.getElementById("alarm-toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `alarm-toast is-${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <div class="alarm-toast-title">${title}</div>
    <div class="alarm-toast-message">${message}</div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  let removed = false;
  const removeToast = () => {
    if (removed) return;
    removed = true;
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 220);
  };

  window.setTimeout(removeToast, 3000);
}

function showAlarmConfirm(message, title = "알람 확인") {
  if (typeof window.showAppConfirm === "function") {
    return window.showAppConfirm(message, title);
  }

  const modal = document.getElementById("alarm-confirm-modal");
  const messageEl = document.getElementById("alarm-confirm-message");
  const titleEl = document.getElementById("alarm-confirm-title");
  const confirmBtn = document.getElementById("alarm-confirm-ok-btn");
  const cancelBtn = document.getElementById("alarm-confirm-cancel-btn");
  const backdrop = modal?.querySelector("[data-alarm-confirm-close='backdrop']");

  if (!modal || !messageEl || !titleEl || !confirmBtn || !cancelBtn || !backdrop) {
    return Promise.resolve(window.confirm(message));
  }

  messageEl.textContent = message;
  titleEl.textContent = title;
  modal.classList.remove("hidden");

  return new Promise((resolve) => {
    const cleanup = () => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      backdrop.removeEventListener("click", handleCancel);
      document.removeEventListener("keydown", handleKeydown);
    };

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    backdrop.addEventListener("click", handleCancel);
    document.addEventListener("keydown", handleKeydown);
    confirmBtn.focus();
  });
}

function getFriendlyAlarmError(error, fallbackMessage) {
  if (error instanceof TypeError && /fetch/i.test(error.message || "")) {
    return "서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인해주세요.";
  }
  return error?.message || fallbackMessage;
}

async function alarmApiRequest(path, options = {}, fallbackMessage = "알람 요청에 실패했습니다.") {
  try {
    if (typeof apiRequest === "function") {
      return await apiRequest(path, options);
    }

    const token = getAccessToken();
    const response = await fetch(`/api/v1${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    const payload = contentType.includes("application/json") && rawText
      ? JSON.parse(rawText)
      : rawText;

    if (!response.ok) {
      const detail = typeof payload === "object" && payload !== null
        ? payload.detail
        : payload;
      throw new Error(detail || fallbackMessage);
    }

    return payload;
  } catch (error) {
    throw new Error(getFriendlyAlarmError(error, fallbackMessage));
  }
}

const shownAlarmMap = new Map();

async function requestAlarmNotificationPermission() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error("알림 권한 요청 실패:", error);
    }
  }
}

function getSelectedRepeatDays() {
  const dayIdMap = {
    MON: "day-mon",
    TUE: "day-tue",
    WED: "day-wed",
    THU: "day-thu",
    FRI: "day-fri",
    SAT: "day-sat",
    SUN: "day-sun",
  };

  return Object.entries(dayIdMap)
    .filter(([, id]) => document.getElementById(id)?.classList.contains("is-active"))
    .map(([day]) => day);
}

function setupDayAllToggle() {
  const allBtn = document.getElementById("day-all");
  const dayIds = ALL_DAYS.map((d) => `day-${d.toLowerCase()}`);

  if (!allBtn) return;

  allBtn.addEventListener("click", () => {
    const isActive = allBtn.classList.toggle("is-active");
    dayIds.forEach((id) => {
      document.getElementById(id)?.classList.toggle("is-active", isActive);
    });
  });

  dayIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.classList.toggle("is-active");
      allBtn.classList.toggle(
        "is-active",
        dayIds.every((i) => document.getElementById(i)?.classList.contains("is-active"))
      );
    });
  });
}

function showAlarmNotification(alarm) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = Date.now();
  const lastShownAt = shownAlarmMap.get(alarm.id);

  if (lastShownAt && now - lastShownAt < 60000) {
    return;
  }

  shownAlarmMap.set(alarm.id, now);

  const notification = new Notification("말벗 알람", {
    body: `설정한 알람 시간입니다. (${alarm.alarm_time})`,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = "/";
  };
}

let editingAlarmId = null;

function showAlarmListView() {
  document.getElementById("alarm-view-list")?.classList.remove("hidden");
  document.getElementById("alarm-view-form")?.classList.add("hidden");
  editingAlarmId = null;
}

function resetAlarmForm() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  setAlarmTimeSelects(`${hh}:${mm}`);

  ALL_DAYS.forEach((d) => {
    document.getElementById(`day-${d.toLowerCase()}`)?.classList.remove("is-active");
  });
  document.getElementById("day-all")?.classList.remove("is-active");
}

function showAlarmFormView(mode) {
  document.getElementById("alarm-view-list")?.classList.add("hidden");
  document.getElementById("alarm-view-form")?.classList.remove("hidden");

  const title = document.getElementById("alarm-form-title");
  if (title) title.textContent = mode === "edit" ? "알람 수정" : "알람 추가";

  if (mode === "create") {
    resetAlarmForm();
  }
}

function renderAlarmList(alarms) {
  const alarmListEl = document.getElementById("alarm-list");
  if (!alarmListEl) return;

  alarmListEl.innerHTML = "";

  if (!alarms || alarms.length === 0) {
    alarmListEl.innerHTML = "<p>등록된 알람이 없습니다.</p>";
    return;
  }

  alarms.forEach((alarm) => {
    const item = document.createElement("div");
    item.className = "profile-alarm-row";

    const korDays = formatDaysKorean(alarm.repeat_days);
    const timeDisplay = String(alarm.alarm_time).slice(0, 5);

    item.innerHTML = `
      <div>
        <p class="profile-calendar-caption" style="margin-bottom:4px;">Alarm</p>
        <p class="profile-alarm-item-time">${timeDisplay}</p>
        <p class="profile-alarm-item-days">${korDays}</p>
      </div>
      <div class="profile-alarm-item-actions">
        <button type="button" data-alarm-id="${alarm.id}" class="edit-alarm-btn profile-calendar-nav">수정</button>
        <button type="button" data-alarm-id="${alarm.id}" class="delete-alarm-btn profile-calendar-nav is-danger">삭제</button>
      </div>
    `;

    alarmListEl.appendChild(item);
  });

  alarmListEl.querySelectorAll(".edit-alarm-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const alarmId = parseInt(btn.dataset.alarmId, 10);
      const alarm = alarms.find((a) => a.id === alarmId);
      if (alarm) fillFormForEdit(alarm);
    });
  });

  alarmListEl.querySelectorAll(".delete-alarm-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const alarmId = parseInt(btn.dataset.alarmId, 10);
      deleteAlarm(alarmId);
    });
  });
}

function fillFormForEdit(alarm) {
  editingAlarmId = alarm.id;
  setAlarmTimeSelects(String(alarm.alarm_time).slice(0, 5));

  const dayIdMap = {
    MON: "day-mon",
    TUE: "day-tue",
    WED: "day-wed",
    THU: "day-thu",
    FRI: "day-fri",
    SAT: "day-sat",
    SUN: "day-sun",
  };

  const activeDays = alarm.repeat_days
    ? alarm.repeat_days.split(",").map((d) => d.trim())
    : [];

  ALL_DAYS.forEach((day) => {
    const btn = document.getElementById(dayIdMap[day]);
    if (btn) btn.classList.toggle("is-active", activeDays.includes(day));
  });

  const allBtn = document.getElementById("day-all");
  if (allBtn) allBtn.classList.toggle("is-active", activeDays.length === 7);

  showAlarmFormView("edit");
}

async function loadAlarms() {
  const token = getAccessToken();
  if (!token) {
    showAlarmToast("로그인이 필요합니다.", "error", "알람");
    return;
  }

  try {
    const alarms = await alarmApiRequest(
      "/alarms/",
      { method: "GET" },
      "알람 목록을 불러오지 못했습니다."
    );
    renderAlarmList(alarms);
  } catch (error) {
    console.error("알람 목록 조회 실패", error);
    showAlarmToast(
      getFriendlyAlarmError(error, "알람 목록을 불러오지 못했습니다."),
      "error",
      "불러오기 실패"
    );
  }
}

async function deleteAlarm(alarmId) {
  const confirmed = await showAlarmConfirm("알람을 삭제할까요?", "알람 삭제");
  if (!confirmed) return;

  const token = getAccessToken();
  if (!token) {
    showAlarmToast("로그인이 필요합니다.", "error", "알람");
    return;
  }

  try {
    await alarmApiRequest(
      `/alarms/${alarmId}`,
      { method: "DELETE" },
      "알람 삭제에 실패했습니다."
    );
    await loadAlarms();
    showAlarmToast("알람이 삭제되었습니다.", "success", "삭제 완료");
  } catch (error) {
    console.error("알람 삭제 실패:", error);
    showAlarmToast(
      getFriendlyAlarmError(error, "알람 삭제에 실패했습니다."),
      "error",
      "삭제 실패"
    );
  }
}

async function saveAlarm() {
  const token = getAccessToken();
  if (!token) {
    showAlarmToast("로그인이 필요합니다.", "error", "알람");
    return;
  }

  const alarmTime = getAlarmTimeValue();
  if (!alarmTime) {
    showAlarmToast("알람 시간을 선택해주세요.", "info", "입력 확인");
    return;
  }

  const repeatDays = getSelectedRepeatDays();
  if (repeatDays.length === 0) {
    showAlarmToast("반복 요일을 하나 이상 선택해주세요.", "info", "입력 확인");
    return;
  }

  const body = {
    alarm_time: alarmTime,
    repeat_days: repeatDays,
    is_enabled: true,
  };

  const isEditMode = editingAlarmId !== null;

  try {
    await alarmApiRequest(
      isEditMode ? `/alarms/${editingAlarmId}` : "/alarms/",
      {
        method: isEditMode ? "PUT" : "POST",
        body: getJsonBody(body),
      },
      isEditMode ? "알람 수정에 실패했습니다." : "알람 저장에 실패했습니다."
    );

    showAlarmToast(
      isEditMode ? "알람이 수정되었습니다." : "알람이 저장되었습니다.",
      "success",
      isEditMode ? "수정 완료" : "저장 완료"
    );

    showAlarmListView();
    await loadAlarms();
  } catch (error) {
    console.error("알람 저장/수정 실패:", error);
    showAlarmToast(
      getFriendlyAlarmError(error, "알람 저장에 실패했습니다."),
      "error",
      "저장 실패"
    );
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker 등록 성공:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service Worker 등록 실패:", error);
    return null;
  }
}

async function subscribePush(registration) {
  try {
    const token = getAccessToken();
    if (!token) return;

    const keyData = await alarmApiRequest(
      "/alarms/push/public-key",
      { method: "GET" },
      "푸시 공개키를 불러오지 못했습니다."
    );

    const publicKey = keyData?.publicKey;
    if (!publicKey) {
      console.warn("VAPID 공개키가 없어 푸시 구독을 건너뜁니다.");
      return;
    }

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await alarmApiRequest(
      "/alarms/push/subscribe",
      {
        method: "POST",
        body: JSON.stringify(subscription),
      },
      "푸시 구독 저장에 실패했습니다."
    );
  } catch (error) {
    console.error("Push 구독 실패:", error);
  }
}

async function checkDueAlarmsForNotification() {
  const token = getAccessToken();
  if (!token) return;

  try {
    const data = await alarmApiRequest(
      "/alarms/due",
      { method: "GET" },
      "알람 상태를 확인하지 못했습니다."
    );

    if (!data?.items?.length) return;
    data.items.forEach((alarm) => showAlarmNotification(alarm));
  } catch (error) {
    console.error("due 알람 조회 실패:", error);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  populateAlarmTimeSelects();
  setupDayAllToggle();

  const registration = await registerServiceWorker();
  await requestAlarmNotificationPermission();

  if (registration) {
    await subscribePush(registration);
  }

  document.getElementById("save-alarm-btn")?.addEventListener("click", saveAlarm);
  document.getElementById("add-alarm-btn")?.addEventListener("click", () => showAlarmFormView("create"));
  document.getElementById("back-to-list-btn")?.addEventListener("click", showAlarmListView);
  document.getElementById("cancel-alarm-btn")?.addEventListener("click", showAlarmListView);

  await loadAlarms();
  // await checkDueAlarmsForNotification();
  // setInterval(() => {
  //   checkDueAlarmsForNotification();
  // }, 30000);
});
