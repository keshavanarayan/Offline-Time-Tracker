// --- State Management Constants ---
const STORAGE_KEY_LOGS = "offlineTimeTrackerLogs";
const STORAGE_KEY_ACTIVE = "offlineTimeTrackerActive";
const STORAGE_KEY_USERNAME = "offlineTimeTrackerUsername";
const STORAGE_KEY_EXPORT_FOLDER = "offlineTimeTrackerExportFolder";
const STORAGE_KEY_LAST_EXPORT = "offlineTimeTrackerLastExport";
const STORAGE_KEY_UPDATE_FOLDER = "offlineTimeTrackerUpdateFolder";
const STORAGE_KEY_HEARTBEAT = "offlineTimeTrackerLastHeartbeat";
const STORAGE_KEY_DEADLINE_HOUR = "offlineTimeTrackerDeadlineHour";
const STORAGE_KEY_TUTORIAL = "offlineTimeTrackerTutorialSeen";

// --- Application State ---
let logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS)) || [];
let activeSession = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVE)) || null;
let currentUsername = localStorage.getItem(STORAGE_KEY_USERNAME) || "";
let deadlineHour = parseInt(localStorage.getItem(STORAGE_KEY_DEADLINE_HOUR) || "18", 10);
let timerInterval = null;
let isExportDirty = false;
let systemInfo = { hostname: "", osUsername: "", defaultExportFolder: "" };

let isPaused = false;
let pausedTimeAcc = 0;
let pauseStartTime = null;

// --- Electron API Integration ---
let ipcRenderer = null;
if (window.electronAPI) {
  try {
    ipcRenderer = window.electronAPI;
  } catch (e) {
    console.warn("Error accessing electronAPI:", e);
  }
} else {
  console.warn("Not running in Electron. Auto-export disabled.");
}

// --- Persistence Helpers ---
function saveLogs() {
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
}

function saveActiveSession() {
  if (activeSession) {
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeSession));
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
  }
}

function saveUsername() {
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    currentUsername = usernameInput.value.trim();
    localStorage.setItem(STORAGE_KEY_USERNAME, currentUsername);
  }
}

// --- Validation Helpers ---
function hasIncompleteLogs() {
  return logs.some((log) => !log.client || !log.project || !log.task);
}

function ensureUsername() {
  const usernameInput = document.getElementById("usernameInput");
  const username = usernameInput ? usernameInput.value.trim() : currentUsername;
  if (!username) {
    if (usernameInput) {
      usernameInput.classList.add("input-error");
      usernameInput.focus();
    }
    return false;
  }
  if (usernameInput) {
    usernameInput.classList.remove("input-error");
  }
  return true;
}
