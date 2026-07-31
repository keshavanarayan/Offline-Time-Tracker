// --- State Management ---
const STORAGE_KEY_LOGS = "offlineTimeTrackerLogs";
const STORAGE_KEY_ACTIVE = "offlineTimeTrackerActive";
const STORAGE_KEY_USERNAME = "offlineTimeTrackerUsername";
const STORAGE_KEY_EXPORT_FOLDER = "offlineTimeTrackerExportFolder";
const STORAGE_KEY_LAST_EXPORT = "offlineTimeTrackerLastExport";
const STORAGE_KEY_UPDATE_FOLDER = "offlineTimeTrackerUpdateFolder";
const STORAGE_KEY_HEARTBEAT = "offlineTimeTrackerLastHeartbeat";
const STORAGE_KEY_DEADLINE_HOUR = "offlineTimeTrackerDeadlineHour";
const STORAGE_KEY_TUTORIAL = "offlineTimeTrackerTutorialSeen";

let logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS)) || [];
let activeSession = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVE)) || null;
let currentUsername = localStorage.getItem(STORAGE_KEY_USERNAME) || "";
let deadlineHour = parseInt(localStorage.getItem(STORAGE_KEY_DEADLINE_HOUR) || "18", 10);
let timerInterval = null;

// --- Electron Integration ---
let ipcRenderer = null;
if (window.electronAPI) {
  try {
    ipcRenderer = window.electronAPI;
  } catch (e) {
    console.warn("Error accessing electronAPI: ", e);
  }
} else {
  console.warn("Not running in Electron. Auto-export disabled.");
}

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

let isPaused = false;
let pausedTimeAcc = 0;
let pauseStartTime = null;

// --- Initialization ---
function init() {
  usernameInput.value = currentUsername;
  updateProjectList();
  updateClientList();
  renderLogs();

  // Check auto-export settings on load
  if (localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER) && ipcRenderer) {
    autoExportBtn.classList.add("active");
    autoExportBtn.innerHTML = `✅ Auto-Export Active`;
  }

  if (ipcRenderer) {
    checkUpdateServerStatus();
    checkAutoExport();
    setInterval(checkAutoExport, 60 * 1000); // Check auto-export every 1 minute
  } else {
    autoExportBtn.style.display = "none"; // Hide if just running in a standard web browser
  }

  // Resume timer if page was closed while running
  if (activeSession) {
    const lastHeartbeat = parseInt(localStorage.getItem(STORAGE_KEY_HEARTBEAT) || "0", 10);
    const now = Date.now();

    // ponytail: auto-stops session if PC was shut down (heartbeat gap > 30s)
    if (lastHeartbeat > 0 && (now - lastHeartbeat) > 30000) {
      autoStopAbortedSession(lastHeartbeat);
    } else {
      clientInput.value = activeSession.client || "";
      projectInput.value = activeSession.project || "";
      taskInput.value = activeSession.task || "";

      startBtn.classList.add("hidden");
      pauseBtn.classList.remove("hidden");
      stopBtn.classList.remove("hidden");

      timerInterval = setInterval(updateDisplay, 1000);
      updateDisplay();
    }
  }

  // Automatically trigger tutorial on first run
  if (!localStorage.getItem(STORAGE_KEY_TUTORIAL)) {
    setTimeout(openTutorial, 400);
  }

  // Set up IPC listeners
  if (ipcRenderer) {
    ipcRenderer.on('toggle-mini-mode', (isMini) => {
      if (isMini) {
        document.body.classList.add('mini-mode');
      } else {
        document.body.classList.remove('mini-mode');
      }
    });

    ipcRenderer.on('app-closing', () => {
      let hasMissingInfo = false;

      // Check if any previous log has missing info
      for (const log of logs) {
        if (!log.client || !log.project || !log.task) {
          hasMissingInfo = true;
          break;
        }
      }

      if (hasMissingInfo) {
        showCustomAlert("Warning: You have previous time logs with missing Client, Project, or Task information. Please update them before closing the app.");
        if (document.body.classList.contains('mini-mode')) {
          restoreWindow();
        }
        return; // Block close
      }

      if (activeSession) {
        const client = clientInput.value.trim();
        const project = projectInput.value.trim();
        const task = taskInput.value.trim();

        if (!client || !project || !task) {
          showCustomAlert("Wait! Please fill in the Client, Project and Task before shutting down.");
          if (document.body.classList.contains('mini-mode')) {
            restoreWindow();
          }
          return; // Do not close yet
        }

        // Everything is filled, so stop the timer (which saves the log)
        stopTimer();
      }

      // Tell main process it is safe to quit now
      ipcRenderer.send('quit-app');
    });

    // Intercept mini-mode transition
    ipcRenderer.on('check-can-mini-mode', () => {
      let hasMissingLogInfo = false;
      for (const log of logs) {
        if (!log.client || !log.project || !log.task) {
          hasMissingLogInfo = true;
          break;
        }
      }

      if (hasMissingLogInfo) {
        showCustomAlert("Warning: You have previous time logs with missing Client, Project, or Task information. Please update them before minimizing.");
        return;
      }

      const username = usernameInput.value.trim();
      const client = clientInput.value.trim();
      const project = projectInput.value.trim();
      const task = taskInput.value.trim();

      if (!username) {
        usernameInput.classList.add("input-error");
        usernameInput.focus();
        showCustomAlert("Please enter your Name before minimizing.");
        return;
      }

      if (!client || !project || !task || !activeSession) {
        showCustomAlert("Please set the Client, Project, Task and start the timer for the app to minimize.");
        return;
      }

      ipcRenderer.send('allow-mini-mode');
    });

    // Intercept native window minimize
    ipcRenderer.on('check-can-minimize', () => {
      let hasMissingLogInfo = false;
      for (const log of logs) {
        if (!log.client || !log.project || !log.task) {
          hasMissingLogInfo = true;
          break;
        }
      }

      if (hasMissingLogInfo) {
        showCustomAlert("Warning: You have previous time logs with missing Client, Project, or Task information. Please update them before minimizing.");
        return;
      }

      const username = usernameInput.value.trim();
      const client = clientInput.value.trim();
      const project = projectInput.value.trim();
      const task = taskInput.value.trim();

      if (!username) {
        usernameInput.classList.add("input-error");
        usernameInput.focus();
        showCustomAlert("Please enter your Name before minimizing.");
        return;
      }

      if (!client || !project || !task || !activeSession) {
        showCustomAlert("Please set the Client, Project, Task and start the timer for the app to minimize.");
        return;
      }

      ipcRenderer.send('allow-minimize');
    });
  }
}

function getFormattedDateForExport() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return yyyy + mm + dd;
}

async function setupAutoUpdate() {
  if (!ipcRenderer) return;

  const selectedPath = await ipcRenderer.invoke('select-update-folder');
  if (selectedPath) {
    localStorage.setItem(STORAGE_KEY_UPDATE_FOLDER, selectedPath);
    alert(`Update folder location set to:\n${selectedPath}`);
    checkUpdateServerStatus();
  }
}

function toggleAdvancedSettings() {
  const menu = document.getElementById("advancedSettingsMenu");
  if (menu) menu.classList.toggle("show");
}

// Close dropdown when clicking outside
window.addEventListener("click", function(event) {
  if (!event.target.closest("#advancedSettingsDropdown")) {
    const menu = document.getElementById("advancedSettingsMenu");
    if (menu && menu.classList.contains("show")) {
      menu.classList.remove("show");
    }
  }
});

function manualCheckForUpdates() {
  if (!ipcRenderer) return;
  const btn = document.getElementById("checkUpdateBtn");
  btn.innerText = "Checking...";
  ipcRenderer.send('trigger-update-check');
  setTimeout(() => {
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg> Check Updates`;
  }, 3000);
}

function openURL(url) {
  if (ipcRenderer) {
    ipcRenderer.send('open-url', url);
  } else {
    window.open(url, '_blank');
  }
}

async function checkUpdateServerStatus() {
  if (!ipcRenderer) return;
  const statusBtn = document.getElementById("autoUpdateStatusBtn");
  statusBtn.classList.remove("hidden");

  const customFolder = localStorage.getItem(STORAGE_KEY_UPDATE_FOLDER) || null;

  try {
    const isOnline = await ipcRenderer.invoke('check-update-server', customFolder);
    if (isOnline) {
      statusBtn.style.backgroundColor = "#16a34a";
      statusBtn.style.color = "#ffffff";
      statusBtn.innerHTML = "Update Server Online";
      statusBtn.title = `The update server is accessible at ${customFolder || "configured path"}.\nClick to configure.`;
    } else {
      statusBtn.style.backgroundColor = "#dc2626";
      statusBtn.style.color = "#ffffff";
      statusBtn.innerHTML = "Update Server Offline";
      statusBtn.title = `Cannot reach ${customFolder || "configured path"}. Updates may not work.\nClick to configure.`;
    }

    if (isOnline) {
      ipcRenderer.send('set-update-url', customFolder);
    }
  } catch (e) {
    statusBtn.style.backgroundColor = "#dc2626";
    statusBtn.style.color = "#ffffff";
    statusBtn.innerHTML = "Update Check Failed";
    statusBtn.title = "Error checking the update server.\nClick to configure.";
  }
}

// --- Interactive Tutorial Popover & Spotlight Logic ---
let currentTutorialStep = 0;

const tutorialSteps = [
  {
    target: ".app-container",
    title: "Important Note: Full Screen & Mini Mode",
    content: "<div style='background-color: #f8fafc; border-left: 3px solid #0f172a; padding: 10px; margin-bottom: 8px;'><strong style='color:#0f172a;'>Full Screen Startup:</strong> This app intentionally opens in full screen on startup to prompt work logging.</div><p>Please note that the app <strong>will not minimize to Mini Mode</strong> until you enter your Client, Project, and Task information and start the timer.</p>",
    position: "center"
  },
  {
    target: "#usernameInput",
    title: "1. User Identity Setup",
    content: "Enter your name here. All exported CSV timesheets will tag your entries with this name.",
    position: "bottom-left"
  },
  {
    target: ".timer-controls",
    title: "2. Timer Controls",
    content: "Fill in Client, Project, and Task details, then use <strong>▶ (Start)</strong>, <strong>⏸ (Pause)</strong>, and <strong>■ (Stop)</strong> to track your work session.",
    position: "top-left"
  },
  {
    target: ".timer-section",
    title: "3. Project & Task Inputs",
    content: "Type your Client and Project names here. The app automatically saves and suggests your previous entries as you type.",
    position: "bottom-left"
  },
  {
    target: "#autoExportBtn",
    title: "4. Auto-Export Location",
    content: "Click here to set your auto-export folder (can be a <strong>local folder</strong> on your PC or a <strong>shared LAN drive</strong>). The app automatically backs up weekly CSV timesheets every Monday.",
    position: "bottom-left"
  },
  {
    target: "#autoUpdateStatusBtn",
    title: "5. Update Server Status",
    content: "Shows whether the update folder is accessible (Green = Online, Red = Offline). Click anytime to configure your update folder location (supports both <strong>local folders</strong> and <strong>LAN network shares</strong>).",
    position: "bottom-left"
  }
];

function openTutorial() {
  currentTutorialStep = 0;
  document.getElementById('tutorialOverlay').classList.remove('hidden');
  document.getElementById('tutorialPopover').classList.remove('hidden');
  renderTutorialStep();
}

function closeTutorial() {
  document.getElementById('tutorialOverlay').classList.add('hidden');
  document.getElementById('tutorialPopover').classList.add('hidden');
  clearTutorialHighlights();
  localStorage.setItem(STORAGE_KEY_TUTORIAL, "true");
}

function clearTutorialHighlights() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
}

function renderTutorialStep() {
  clearTutorialHighlights();
  const step = tutorialSteps[currentTutorialStep];
  const targetEl = document.querySelector(step.target);

  document.getElementById('tutorialTitle').textContent = step.title;
  document.getElementById('tutorialStepIndicator').textContent = `Step ${currentTutorialStep + 1} of ${tutorialSteps.length}`;
  document.getElementById('tutorialBody').innerHTML = step.content;

  const prevBtn = document.getElementById('tutorialPrevBtn');
  const nextBtn = document.getElementById('tutorialNextBtn');

  prevBtn.style.visibility = currentTutorialStep === 0 ? "hidden" : "visible";
  nextBtn.textContent = currentTutorialStep === tutorialSteps.length - 1 ? "Got it!" : "Next";

  const popover = document.getElementById('tutorialPopover');

  if (step.position === "center" || !targetEl || targetEl.offsetWidth === 0 || targetEl.offsetHeight === 0) {
    popover.style.top = "50%";
    popover.style.left = "50%";
    popover.style.transform = "translate(-50%, -50%)";
  } else {
    popover.style.transform = "none";
    targetEl.classList.add('tutorial-highlight');
    const rect = targetEl.getBoundingClientRect();
    
    let top = rect.bottom + 10;
    let left = rect.left;

    if (step.position === "top-left") {
      top = rect.top - 170;
      left = rect.left;
    } else if (step.position === "bottom-left") {
      top = rect.bottom + 10;
      left = Math.max(16, rect.left - 100);
    }

    left = Math.min(window.innerWidth - 340, Math.max(16, left));
    top = Math.min(window.innerHeight - 200, Math.max(16, top));

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }
}

function nextTutorialStep() {
  if (currentTutorialStep < tutorialSteps.length - 1) {
    currentTutorialStep++;
    renderTutorialStep();
  } else {
    closeTutorial();
  }
}

function prevTutorialStep() {
  if (currentTutorialStep > 0) {
    currentTutorialStep--;
    renderTutorialStep();
  }
}

function showCustomAlert(message) {
  document.getElementById('modalMessage').textContent = message;
  const actions = document.getElementById('modalActions');
  actions.innerHTML = `
    <button class="btn btn-start btn-modal" id="modalOkBtn">OK</button>
  `;
  document.getElementById('customModal').classList.remove('hidden');

  document.getElementById('modalOkBtn').onclick = () => {
    document.getElementById('customModal').classList.add('hidden');
  };
}

function showCustomConfirm(message, callback) {
  document.getElementById('modalMessage').textContent = message;
  const actions = document.getElementById('modalActions');
  actions.innerHTML = `
    <button class="btn btn-stop btn-modal" id="modalCancelBtn">Cancel</button>
    <button class="btn btn-start btn-modal" id="modalConfirmBtn" style="margin-left: 10px;">Yes</button>
  `;
  document.getElementById('customModal').classList.remove('hidden');

  document.getElementById('modalCancelBtn').onclick = () => {
    document.getElementById('customModal').classList.add('hidden');
    callback(false);
  };
  document.getElementById('modalConfirmBtn').onclick = () => {
    document.getElementById('customModal').classList.add('hidden');
    callback(true);
  };
}

function showTimePickerModal(currentHour, callback) {
  document.getElementById('modalMessage').textContent = "Select Closing Deadline Time:";
  const actions = document.getElementById('modalActions');

  let selectOptions = '';
  for (let h = 0; h < 24; h++) {
    const label = formatHour12(h);
    const selected = h === currentHour ? 'selected' : '';
    selectOptions += `<option value="${h}" ${selected}>${label}</option>`;
  }

  actions.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; gap: 16px; align-items: center;">
      <select id="deadlineTimeSelect" class="input-field" style="width: 200px; padding: 10px; font-size: 1rem; text-align: center; background-color: var(--input-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 6px;">
        ${selectOptions}
      </select>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-stop btn-modal" id="modalCancelTimeBtn">Cancel</button>
        <button class="btn btn-start btn-modal" id="modalSaveTimeBtn">Save Deadline</button>
      </div>
    </div>
  `;
  document.getElementById('customModal').classList.remove('hidden');

  document.getElementById('modalCancelTimeBtn').onclick = () => {
    document.getElementById('customModal').classList.add('hidden');
    callback(null);
  };
  document.getElementById('modalSaveTimeBtn').onclick = () => {
    const selectedVal = parseInt(document.getElementById('deadlineTimeSelect').value, 10);
    document.getElementById('customModal').classList.add('hidden');
    callback(selectedVal);
  };
}

function formatHour12(hour24) {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}:00 ${period}`;
}

function configureDeadlineTime() {
  showTimePickerModal(deadlineHour, (newHour) => {
    if (newHour !== null) {
      deadlineHour = newHour;
      localStorage.setItem(STORAGE_KEY_DEADLINE_HOUR, deadlineHour.toString());
      showCustomAlert(`Closing deadline updated to ${formatHour12(deadlineHour)}.`);
    }
  });
}

// --- Window Controls ---
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

function shutdownApp() {
  if (activeSession) {
    stopTimer();
  }
  if (ipcRenderer) {
    ipcRenderer.send('quit-app');
  }
}

// --- User Logic ---
function saveUsername() {
  currentUsername = usernameInput.value.trim();
  localStorage.setItem(STORAGE_KEY_USERNAME, currentUsername);
}

function updateProjectList() {
  const selectedClient = clientInput ? clientInput.value.trim().toLowerCase() : "";
  let filteredLogs = logs;
  if (selectedClient) {
    filteredLogs = logs.filter((log) => (log.client || "").trim().toLowerCase() === selectedClient);
  }
  const uniqueProjects = [
    ...new Set(filteredLogs.map((log) => log.project).filter(Boolean)),
  ];
  projectSuggestions.innerHTML = "";
  uniqueProjects.forEach((proj) => {
    const option = document.createElement("option");
    option.value = proj;
    projectSuggestions.appendChild(option);
  });
}

function updateClientList() {
  const uniqueClients = [
    ...new Set(logs.map((log) => log.client).filter(Boolean)),
  ];
  clientSuggestions.innerHTML = "";
  uniqueClients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client;
    clientSuggestions.appendChild(option);
  });
}

// --- Core Logic ---
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function togglePauseTimer() {
  if (!activeSession) return;

  if (!isPaused) {
    isPaused = true;
    pauseStartTime = Date.now();
    clearInterval(timerInterval);
    pauseBtn.innerHTML = "▶";
    pauseBtn.title = "Resume Timer";
  } else {
    isPaused = false;
    if (pauseStartTime) {
      pausedTimeAcc += (Date.now() - pauseStartTime);
      pauseStartTime = null;
    }
    timerInterval = setInterval(updateDisplay, 1000);
    pauseBtn.innerHTML = "⏸";
    pauseBtn.title = "Pause Timer";
  }
}

function autoStopAbortedSession(lastHeartbeat) {
  if (!activeSession) return;
  const duration = (lastHeartbeat - activeSession.startTime) - pausedTimeAcc;
  const newLog = {
    id: Date.now().toString(),
    client: activeSession.client || "",
    project: activeSession.project || "",
    task: activeSession.task || "",
    username: currentUsername,
    startTime: activeSession.startTime,
    endTime: lastHeartbeat,
    duration: Math.max(0, duration),
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));

  activeSession = null;
  isPaused = false;
  pausedTimeAcc = 0;
  pauseStartTime = null;
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
  localStorage.removeItem(STORAGE_KEY_HEARTBEAT);

  timerDisplay.textContent = "00:00:00";
  pauseBtn.classList.add("hidden");
  stopBtn.classList.add("hidden");
  startBtn.classList.remove("hidden");

  renderLogs();
}

function updateDisplay() {
  if (!activeSession) return;
  let elapsed = Date.now() - activeSession.startTime - pausedTimeAcc;
  if (isPaused && pauseStartTime) {
    elapsed = pauseStartTime - activeSession.startTime - pausedTimeAcc;
  } else {
    localStorage.setItem(STORAGE_KEY_HEARTBEAT, Date.now().toString());
  }
  timerDisplay.textContent = formatTime(Math.max(0, elapsed));
}

function startTimer() {
  const client = clientInput.value.trim();
  const project = projectInput.value.trim();
  const task = taskInput.value.trim();

  const username = usernameInput.value.trim();

  if (!username) {
    usernameInput.classList.add("input-error");
    usernameInput.focus();
    showCustomAlert("Please enter your Name before starting the timer.");
    return;
  } else {
    usernameInput.classList.remove("input-error");
  }

  if (!client) {
    clientInput.classList.add("input-error");
  } else {
    clientInput.classList.remove("input-error");
  }

  if (!project) {
    projectInput.classList.add("input-error");
  } else {
    projectInput.classList.remove("input-error");
  }

  if (!task) {
    taskInput.classList.add("input-error");
  } else {
    taskInput.classList.remove("input-error");
  }

  if (!client || !project || !task) {
    showCustomAlert("Please fill in the Client, Project, and Task before starting the timer.");
    return;
  }

  checkNewClientAndStart(client, project, task);
}

function checkNewClientAndStart(client, project, task) {
  if (client) {
    const existingClients = [...new Set(logs.map((l) => (l.client || "").trim().toLowerCase()))];
    if (!existingClients.includes(client.toLowerCase())) {
      showCustomConfirm(`"${client}" is a new client. Do you want to add it?`, (confirmed) => {
        if (!confirmed) return;
        checkNewProjectAndStart(client, project, task);
      });
      return;
    }
  }

  checkNewProjectAndStart(client, project, task);
}

function checkNewProjectAndStart(client, project, task) {
  if (project && client) {
    const existingClientProjects = [
      ...new Set(
        logs.filter((l) => (l.client || "").trim().toLowerCase() === client.toLowerCase())
            .map((l) => (l.project || "").trim().toLowerCase())
            .filter(Boolean)
      )
    ];
    if (!existingClientProjects.includes(project.toLowerCase())) {
      showCustomConfirm(`"${project}" is a new project for client "${client}". Do you want to add it?`, (confirmed) => {
        if (!confirmed) return;
        finalizeStartTimer(client, project, task);
      });
      return;
    }
  }

  finalizeStartTimer(client, project, task);
}

function finalizeStartTimer(client, project, task) {
  isPaused = false;
  pausedTimeAcc = 0;
  pauseStartTime = null;

  activeSession = {
    client: client,
    project: project,
    task: task,
    startTime: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeSession));
  localStorage.setItem(STORAGE_KEY_HEARTBEAT, Date.now().toString());

  startBtn.classList.add("hidden");
  pauseBtn.classList.remove("hidden");
  pauseBtn.innerHTML = "⏸";
  pauseBtn.title = "Pause Timer";
  stopBtn.classList.remove("hidden");

  timerInterval = setInterval(updateDisplay, 1000);
  updateDisplay();
}

function restoreWindow() {
  if (ipcRenderer) {
    ipcRenderer.send('restore-window');
  }
}

function stopTimer() {
  if (!activeSession) return;

  if (document.body.classList.contains("mini-mode")) {
    restoreWindow();
  }

  const finalClient = clientInput.value.trim();
  const finalProject = projectInput.value.trim();
  const finalTask = taskInput.value.trim();

  clearInterval(timerInterval);

  const endTime = Date.now();
  const duration = (endTime - activeSession.startTime) - pausedTimeAcc;

  const newLog = {
    id: Date.now().toString(),
    client: finalClient,
    project: finalProject,
    task: finalTask,
    username: currentUsername,
    startTime: activeSession.startTime,
    endTime: endTime,
    duration: Math.max(0, duration),
  };

  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));

  activeSession = null;
  isPaused = false;
  pausedTimeAcc = 0;
  pauseStartTime = null;
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
  localStorage.removeItem(STORAGE_KEY_HEARTBEAT);

  projectInput.disabled = false;
  projectInput.value = "";

  taskInput.disabled = false;
  taskInput.value = "";

  timerDisplay.textContent = "00:00:00";

  pauseBtn.classList.add("hidden");
  stopBtn.classList.add("hidden");
  startBtn.classList.remove("hidden");

  updateProjectList();
  updateClientList();
  renderLogs();
}

function clearAllLogs() {
  if (logs.length === 0) {
    showCustomAlert("There are no entries to delete.");
    return;
  }

  showCustomConfirm("Are you sure you want to delete all time logs?", (confirmed) => {
    if (confirmed) {
      logs = [];
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
      updateProjectList();
      updateClientList();
      renderLogs();
    }
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

  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  renderLogs();
}

function updateLogField(id, field, newValue) {
  const logIndex = logs.findIndex(l => l.id === id);
  if (logIndex === -1) return;

  const log = logs[logIndex];
  log[field] = newValue;

  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  updateProjectList();
  updateClientList();
}

function renderLogs() {
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
        <input type="text" class="input-field" style="padding: 4px; width: 100%; min-width: 120px; font-size: 0.875rem;" value="${escapeHTML(log.client || "")}" onchange="updateLogField('${log.id}', 'client', this.value.trim())" list="clientSuggestions" title="Edit Client">
      </td>
      <td>
        <input type="text" class="input-field" style="padding: 4px; width: 100%; min-width: 120px; font-size: 0.875rem;" value="${escapeHTML(log.project)}" onchange="updateLogField('${log.id}', 'project', this.value.trim())" list="projectSuggestions" title="Edit Project">
      </td>
      <td>
        <select class="input-field" style="padding: 4px; width: 100%; min-width: 100px; font-size: 0.875rem;" onchange="updateLogField('${log.id}', 'task', this.value)" title="Edit Task">
          <option value="" disabled ${!log.task ? 'selected' : ''}>Select...</option>
          <option value="Proposal" ${log.task === 'Proposal' ? 'selected' : ''}>Proposal</option>
          <option value="Scheme" ${log.task === 'Scheme' ? 'selected' : ''}>Scheme</option>
          <option value="Views" ${log.task === 'Views' ? 'selected' : ''}>Views</option>
          <option value="GFC" ${log.task === 'GFC' ? 'selected' : ''}>GFC</option>
          <option value="Estimation" ${log.task === 'Estimation' ? 'selected' : ''}>Estimation</option>
        </select>
      </td>
      <td>
        <input type="text" class="input-field" style="padding: 4px; width: 100%; min-width: 100px; font-size: 0.875rem;" value="${escapeHTML(log.username || "")}" onchange="updateLogField('${log.id}', 'username', this.value.trim())" title="Edit Username">
      </td>
      <td style="color: #6b7280;">${startDate.toLocaleDateString()}</td>
      <td>
        <input type="time" class="input-field" style="padding: 4px; width: 110px;" value="${startTimeStr}" onchange="updateLogTime('${log.id}', 'startTime', this.value)" title="Edit Start Time">
      </td>
      <td>
        <input type="time" class="input-field" style="padding: 4px; width: 110px;" value="${endTimeStr}" onchange="updateLogTime('${log.id}', 'endTime', this.value)" title="Edit End Time">
      </td>
      <td class="duration-cell">${formatTime(log.duration)}</td>
    `;
    logsTableBody.appendChild(tr);
  });
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}

// ponytail: escapes formula injection characters (=, +, -, @) to prevent CSV exploits
function escapeCSVCell(str) {
  if (!str) return '""';
  const text = String(str).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(text)) {
    return `"'${text}"`;
  }
  return `"${text}"`;
}

// --- Export Logic ---
function getCSVContent(logsToExport = logs) {
  const headers = [
    "Username",
    "Client",
    "Project",
    "Task",
    "Date",
    "Start Time",
    "End Time",
    "Duration (Seconds)",
    "Duration (Formatted)",
  ];
  const csvRows = [headers.join(",")];

  logsToExport.forEach((log) => {
    const date = new Date(log.startTime).toLocaleDateString();
    const start = new Date(log.startTime).toLocaleTimeString();
    const end = new Date(log.endTime).toLocaleTimeString();
    const durationSecs = Math.floor(log.duration / 1000);
    const durationFmt = formatTime(log.duration);

    const entryUsername = log.username !== undefined ? log.username : currentUsername;
    const userEscaped = escapeCSVCell(entryUsername);
    const clientEscaped = escapeCSVCell(log.client || "");
    const projectEscaped = escapeCSVCell(log.project || "");
    const taskEscaped = escapeCSVCell(log.task || "");

    csvRows.push(
      [
        userEscaped,
        clientEscaped,
        projectEscaped,
        taskEscaped,
        `"${date}"`,
        `"${start}"`,
        `"${end}"`,
        durationSecs,
        `"${durationFmt}"`,
      ].join(","),
    );
  });

  return csvRows.join("\n");
}

async function setupAutoExport() {
  if (!ipcRenderer) return;

  const folderPath = await ipcRenderer.invoke("select-folder");

  if (folderPath) {
    localStorage.setItem(STORAGE_KEY_EXPORT_FOLDER, folderPath);
    autoExportBtn.classList.add("active");
    autoExportBtn.innerHTML = `✅ Auto-Export Active`;
  }
}

async function checkAutoExport() {
  const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
  if (!exportFolder || logs.length === 0) return;

  const now = new Date();

  if (now.getHours() >= 18) {
    const todayDateStr = now.toISOString().split("T")[0];
    const lastExportDate = localStorage.getItem(STORAGE_KEY_LAST_EXPORT);

    if (lastExportDate !== todayDateStr) {
      saveUsername();
      const csvContent = getCSVContent(logs);

      const namePrefix = currentUsername
        ? `${currentUsername.replace(/[^a-z0-9]/gi, "_")}_`
        : "";
      const fileName = `Daily_Timesheet_${namePrefix}${todayDateStr}.csv`;

      const success = await window.electronAPI.invoke("save-csv-auto", {
        folderPath: exportFolder,
        fileName,
        csvContent,
      });

      if (success !== false) {
        localStorage.setItem(STORAGE_KEY_LAST_EXPORT, todayDateStr);
      }
    }
  }
}

function exportCSV() {
  const btn = document.getElementById("exportBtn");
  if (logs.length === 0) {
    const originalText = btn.innerHTML;
    btn.innerHTML = "No data to export";
    btn.style.backgroundColor = "var(--text-muted)";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.backgroundColor = "";
    }, 2000);
    return;
  }

  saveUsername();

  const csvContent = getCSVContent();
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);

  const startDateStr = new Date(logs[logs.length - 1].startTime).toISOString().split("T")[0];
  const endDateStr = new Date(logs[0].startTime).toISOString().split("T")[0];

  const namePrefix = currentUsername
    ? `${currentUsername.replace(/[^a-z0-9]/gi, "_")}_`
    : "";
  link.setAttribute(
    "download",
    `Timesheet_${namePrefix}${startDateStr} to ${endDateStr}.csv`,
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Keyboard Hotkey Listener
document.addEventListener("keydown", (e) => {
  // Ctrl+Alt+S -> Toggle Start / Pause
  if (e.ctrlKey && e.altKey && e.code === "KeyS") {
    e.preventDefault();
    if (activeSession) {
      togglePauseTimer();
    } else {
      startTimer();
    }
  }
  // Ctrl+Alt+M -> Toggle Mini Mode
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
