// --- DOM Elements ---
const usernameInput = document.getElementById("usernameInput");
const clientInput = document.getElementById("clientInput");
const projectInput = document.getElementById("projectInput");
const taskInput = document.getElementById("taskInput");
const clientSuggestions = document.getElementById("clientSuggestions");
const projectSuggestions = document.getElementById("projectSuggestions");
const timerDisplay = document.getElementById("timerDisplay");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const logsTableBody = document.getElementById("logsTableBody");
const emptyState = document.getElementById("emptyState");
const autoExportBtn = document.getElementById("autoExportBtn");
const logsTable = document.getElementById("logsTable");

// --- Suggestions and Couplings ---
function updateProjectList() {
  const selectedClient = clientInput ? clientInput.value.trim().toLowerCase() : "";
  let filteredLogs = logs;
  if (selectedClient) {
    filteredLogs = logs.filter((log) => (log.client || "").trim().toLowerCase() === selectedClient);
  }
  const uniqueProjects = [
    ...new Set(filteredLogs.map((log) => log.project).filter(Boolean)),
  ];
  if (projectSuggestions) {
    projectSuggestions.innerHTML = "";
    uniqueProjects.forEach((proj) => {
      const option = document.createElement("option");
      option.value = proj;
      projectSuggestions.appendChild(option);
    });
  }
}

function updateClientList() {
  const uniqueClients = [
    ...new Set(logs.map((log) => log.client).filter(Boolean)),
  ];
  if (clientSuggestions) {
    clientSuggestions.innerHTML = "";
    uniqueClients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client;
      clientSuggestions.appendChild(option);
    });
  }
}

// --- Log Table Rendering ---
function renderLogs() {
  if (!logsTableBody || !emptyState || !logsTable) return;

  logsTableBody.innerHTML = "";

  if (logs.length === 0) {
    emptyState.classList.remove("hidden");
    logsTable.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  logsTable.classList.remove("hidden");

  logs.forEach((log) => {
    const startDate = new Date(log.startTime);
    const endDate = new Date(log.endTime);

    const startTimeStr = startDate.toTimeString().substring(0, 5);
    const endTimeStr = endDate.toTimeString().substring(0, 5);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <input type="text" class="input-field table-cell-input" value="${escapeHTML(log.client || "")}" onchange="updateLogField('${log.id}', 'client', this.value.trim())" list="clientSuggestions" title="Edit Client">
      </td>
      <td>
        <input type="text" class="input-field table-cell-input" value="${escapeHTML(log.project)}" onchange="updateLogField('${log.id}', 'project', this.value.trim())" list="projectSuggestions" title="Edit Project">
      </td>
      <td>
        <select class="input-field table-cell-select" onchange="updateLogField('${log.id}', 'task', this.value)" title="Edit Task">
          <option value="" disabled ${!log.task ? 'selected' : ''}>Select...</option>
          <option value="Proposal" ${log.task === 'Proposal' ? 'selected' : ''}>Proposal</option>
          <option value="Scheme" ${log.task === 'Scheme' ? 'selected' : ''}>Scheme</option>
          <option value="Views" ${log.task === 'Views' ? 'selected' : ''}>Views</option>
          <option value="GFC" ${log.task === 'GFC' ? 'selected' : ''}>GFC</option>
          <option value="Estimation" ${log.task === 'Estimation' ? 'selected' : ''}>Estimation</option>
        </select>
      </td>
      <td>
        <input type="text" class="input-field table-cell-username" value="${escapeHTML(log.username || "")}" onchange="updateLogField('${log.id}', 'username', this.value.trim())" title="Edit Username">
      </td>
      <td class="table-date-cell">${startDate.toLocaleDateString()}</td>
      <td>
        <input type="time" class="input-field table-cell-time" value="${startTimeStr}" onchange="updateLogTime('${log.id}', 'startTime', this.value)" title="Edit Start Time">
      </td>
      <td>
        <input type="time" class="input-field table-cell-time" value="${endTimeStr}" onchange="updateLogTime('${log.id}', 'endTime', this.value)" title="Edit End Time">
      </td>
      <td class="duration-cell">${formatTime(log.duration)}</td>
    `;
    logsTableBody.appendChild(tr);
  });
}

function parseTimeStringToDate(baseDate, timeStr) {
  if (!timeStr) return new Date(baseDate);
  const [hours, minutes] = timeStr.split(':');
  const newDate = new Date(baseDate);
  newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return newDate;
}

function updateLogTime(id, field, newValue) {
  const logIndex = logs.findIndex(l => l.id === id);
  if (logIndex === -1) return;

  const log = logs[logIndex];
  const newTime = parseTimeStringToDate(log[field], newValue).getTime();

  log[field] = newTime;

  if (log.endTime < log.startTime) {
    if (field === 'startTime') {
      log.endTime = log.startTime;
    } else {
      log.startTime = log.endTime;
    }
  }

  log.duration = log.endTime - log.startTime;
  saveLogs();
  renderLogs();

  isExportDirty = true;
  checkAutoExport();
}

function updateLogField(id, field, newValue) {
  const logIndex = logs.findIndex(l => l.id === id);
  if (logIndex === -1) return;

  logs[logIndex][field] = newValue;
  saveLogs();
  updateProjectList();
  updateClientList();

  isExportDirty = true;
  checkAutoExport();
}

function clearAllLogs() {
  if (logs.length === 0) {
    showCustomAlert("There are no entries to delete.");
    return;
  }

  showCustomConfirm("Are you sure you want to delete all time logs?", (confirmed) => {
    if (confirmed) {
      logs = [];
      saveLogs();
      updateProjectList();
      updateClientList();
      renderLogs();
      isExportDirty = true;
      checkAutoExport();
    }
  });
}

// --- Window & Lifecycle Controls ---
function restoreWindow() {
  if (ipcRenderer) {
    ipcRenderer.send('restore-window');
  }
}

function minimizeToMiniMode() {
  if (ipcRenderer) {
    ipcRenderer.send('close-window');
  }
}

function closeApp() {
  const now = new Date();
  if (now.getHours() < deadlineHour) {
    showCustomAlert(`Application closing is disabled before ${formatHour12(deadlineHour)}. Please use the minimize (-) button to minimize to mini mode.`);
    return;
  }
  showCustomConfirm("Are you going home and is your work complete for today?", (confirmed) => {
    if (confirmed) {
      shutdownApp();
    }
  });
}

async function shutdownApp() {
  if (activeSession) {
    stopTimer();
  }
  if (ipcRenderer) {
    const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
    if (!exportFolder) {
      showCustomAlert("Please select an Auto-Export folder so your timesheet logs can be saved.");
      const selected = await setupAutoExport();
      if (!selected) return;
    }
    if (logs.length > 0) {
      await checkAutoExport(true);
    }
    ipcRenderer.send('quit-app');
  }
}

// --- Settings & External Links ---
function toggleAdvancedSettings() {
  const menu = document.getElementById("advancedSettingsMenu");
  if (menu) {
    menu.classList.toggle("show");
  }
}

window.onclick = function (event) {
  if (!event.target.closest("#advancedSettingsDropdown")) {
    const menu = document.getElementById("advancedSettingsMenu");
    if (menu && menu.classList.contains("show")) {
      menu.classList.remove("show");
    }
  }
};

function manualCheckForUpdates() {
  if (ipcRenderer) {
    ipcRenderer.send('trigger-update-check');
  }
}

async function checkUpdateServerStatus() {
  const statusBtn = document.getElementById('autoUpdateStatusBtn');
  if (!statusBtn || !ipcRenderer) return;

  const savedFolder = localStorage.getItem(STORAGE_KEY_UPDATE_FOLDER);
  const isAccessible = await ipcRenderer.invoke('check-update-server', savedFolder);

  statusBtn.classList.remove('hidden', 'connected', 'error');

  if (isAccessible) {
    statusBtn.classList.add('connected');
    statusBtn.innerHTML = `🟢 Server Connected`;
    statusBtn.title = `Auto-updates active: ${savedFolder || 'LAN Server'}`;
  } else {
    statusBtn.classList.add('error');
    statusBtn.innerHTML = `🔴 Server Offline`;
    statusBtn.title = `Cannot reach update folder: ${savedFolder || 'LAN Server'}. Click to configure.`;
  }
}

async function setupAutoUpdate() {
  if (!ipcRenderer) return;

  const selectedPath = await ipcRenderer.invoke('select-update-folder');
  if (selectedPath) {
    localStorage.setItem(STORAGE_KEY_UPDATE_FOLDER, selectedPath);
    showCustomAlert(`Update folder location set to:\n${selectedPath}`);
    checkUpdateServerStatus();
    ipcRenderer.send('set-update-url', selectedPath);
  }
}

function openURL(url) {
  if (ipcRenderer) {
    ipcRenderer.send('open-url', url);
  } else {
    window.open(url, '_blank');
  }
}

// --- Application Initialization ---
async function init() {
  if (usernameInput) {
    usernameInput.value = currentUsername;
  }
  updateProjectList();
  updateClientList();
  renderLogs();
  updateAutoExportButtonState();

  if (ipcRenderer) {
    try {
      const info = await ipcRenderer.invoke('get-system-info');
      if (info) {
        systemInfo = info;
        if (!localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER) && systemInfo.defaultExportFolder) {
          localStorage.setItem(STORAGE_KEY_EXPORT_FOLDER, systemInfo.defaultExportFolder);
          updateAutoExportButtonState();
        }
        if (!currentUsername && systemInfo.osUsername) {
          currentUsername = systemInfo.osUsername;
          if (usernameInput) usernameInput.value = currentUsername;
          saveUsername();
        }
      }
    } catch (e) {
      console.warn("Failed to get system info:", e);
    }

    updateAutoExportButtonState();
    checkUpdateServerStatus();
    checkAutoExport();
    setInterval(checkAutoExport, 60 * 1000);
  } else if (autoExportBtn) {
    autoExportBtn.style.display = "none";
  }

  // Resume timer or recover aborted session
  if (activeSession) {
    const lastHeartbeat = parseInt(localStorage.getItem(STORAGE_KEY_HEARTBEAT) || "0", 10);
    const now = Date.now();

    if (lastHeartbeat > 0 && (now - lastHeartbeat) > 30000) {
      autoStopAbortedSession(lastHeartbeat);
    } else {
      if (clientInput) clientInput.value = activeSession.client || "";
      if (projectInput) projectInput.value = activeSession.project || "";
      if (taskInput) taskInput.value = activeSession.task || "";

      if (startBtn) startBtn.classList.add("hidden");
      if (pauseBtn) pauseBtn.classList.remove("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");

      timerInterval = setInterval(updateDisplay, 1000);
      updateDisplay();
    }
  }

  // Tutorial on first launch
  if (!localStorage.getItem(STORAGE_KEY_TUTORIAL)) {
    setTimeout(openTutorial, 400);
  }

  // Register IPC Listeners
  if (ipcRenderer) {
    ipcRenderer.on('toggle-mini-mode', (isMini) => {
      document.body.classList.toggle('mini-mode', isMini);
    });

    ipcRenderer.on('screen-locked', () => {
      if (activeSession && !isPaused) {
        togglePauseTimer();
      }
    });

    ipcRenderer.on('app-closing', async () => {
      if (hasIncompleteLogs()) {
        showCustomAlert("Warning: You have previous time logs with missing Client, Project, or Task information. Please update them before closing the app.");
        if (document.body.classList.contains('mini-mode')) {
          restoreWindow();
        }
        return;
      }

      if (activeSession) {
        const client = clientInput ? clientInput.value.trim() : "";
        const project = projectInput ? projectInput.value.trim() : "";
        const task = taskInput ? taskInput.value.trim() : "";

        if (!client || !project || !task) {
          showCustomAlert("Please fill in Client, Project, and Task for the currently active timer before closing.");
          if (document.body.classList.contains('mini-mode')) {
            restoreWindow();
          }
          return;
        }
        stopTimer();
      }

      const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
      if (!exportFolder) {
        showCustomAlert("Please select an Auto-Export folder so your timesheet logs can be saved.");
        const selected = await setupAutoExport();
        if (!selected) return;
      }

      if (logs.length > 0) {
        await checkAutoExport(true);
      }
      ipcRenderer.send('quit-app');
    });

    ipcRenderer.on('check-can-mini-mode', async () => {
      if (hasIncompleteLogs()) {
        showCustomAlert("Please complete missing Client, Project, and Task entries in your time logs before minimizing.");
        return;
      }

      if (!ensureUsername()) {
        showCustomAlert("Please enter your name before minimizing.");
        return;
      }

      const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
      if (!exportFolder) {
        showCustomAlert("Please select an Auto-Export folder before minimizing.");
        const selected = await setupAutoExport();
        if (!selected) return;
      }

      const client = clientInput ? clientInput.value.trim() : "";
      const project = projectInput ? projectInput.value.trim() : "";
      const task = taskInput ? taskInput.value.trim() : "";

      if (!activeSession) {
        showCustomAlert("You must start a timer (▶) with valid Client, Project, and Task before minimizing to mini mode.");
        return;
      }

      if (!client || !project || !task) {
        showCustomAlert("Please fill in the Client, Project, and Task before minimizing to mini mode.");
        return;
      }

      ipcRenderer.send('allow-mini-mode');
    });

    ipcRenderer.on('check-can-minimize', async () => {
      if (hasIncompleteLogs()) {
        showCustomAlert("Please complete missing Client, Project, and Task entries in your time logs before minimizing.");
        return;
      }

      if (!ensureUsername()) {
        showCustomAlert("Please enter your name before minimizing.");
        return;
      }

      const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
      if (!exportFolder) {
        showCustomAlert("Please select an Auto-Export folder before minimizing.");
        const selected = await setupAutoExport();
        if (!selected) return;
      }

      const client = clientInput ? clientInput.value.trim() : "";
      const project = projectInput ? projectInput.value.trim() : "";
      const task = taskInput ? taskInput.value.trim() : "";

      if (!activeSession) {
        showCustomAlert("You must start a timer (▶) with valid Client, Project, and Task before minimizing.");
        return;
      }

      if (!client || !project || !task) {
        showCustomAlert("Please fill in the Client, Project, and Task before minimizing.");
        return;
      }

      ipcRenderer.send('allow-minimize');
    });
  }
}

// --- Keyboard Hotkey Listener ---
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey && e.code === "KeyS") {
    e.preventDefault();
    if (activeSession) {
      togglePauseTimer();
    } else {
      startTimer();
    }
  }
  if (e.ctrlKey && e.altKey && e.code === "KeyM") {
    e.preventDefault();
    if (document.body.classList.contains("mini-mode")) {
      restoreWindow();
    } else {
      minimizeToMiniMode();
    }
  }
});

// Start app on DOM loaded
document.addEventListener("DOMContentLoaded", init);
