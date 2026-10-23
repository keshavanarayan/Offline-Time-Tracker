// --- Time Formatting Utilities ---
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatHour12(hour24) {
  const period = hour24 >= 12 ? "PM" : "AM";
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}:00 ${period}`;
}

function updateDisplay() {
  const timerDisplay = document.getElementById("timerDisplay");
  if (!activeSession || !timerDisplay) return;

  let elapsed = Date.now() - activeSession.startTime - pausedTimeAcc;
  if (isPaused && pauseStartTime) {
    elapsed = pauseStartTime - activeSession.startTime - pausedTimeAcc;
  } else {
    localStorage.setItem(STORAGE_KEY_HEARTBEAT, Date.now().toString());
  }
  timerDisplay.textContent = formatTime(Math.max(0, elapsed));
}

// --- Timer State Controls ---
function togglePauseTimer() {
  const pauseBtn = document.getElementById("pauseBtn");
  if (!activeSession) return;

  if (!isPaused) {
    isPaused = true;
    pauseStartTime = Date.now();
    clearInterval(timerInterval);
    if (pauseBtn) {
      pauseBtn.innerHTML = "▶";
      pauseBtn.title = "Resume Timer";
    }
  } else {
    isPaused = false;
    if (pauseStartTime) {
      pausedTimeAcc += (Date.now() - pauseStartTime);
      pauseStartTime = null;
    }
    timerInterval = setInterval(updateDisplay, 1000);
    if (pauseBtn) {
      pauseBtn.innerHTML = "⏸";
      pauseBtn.title = "Pause Timer";
    }
  }
}

async function startTimer() {
  const clientInput = document.getElementById("clientInput");
  const projectInput = document.getElementById("projectInput");
  const taskInput = document.getElementById("taskInput");

  const client = clientInput ? clientInput.value.trim() : "";
  const project = projectInput ? projectInput.value.trim() : "";
  const task = taskInput ? taskInput.value.trim() : "";

  if (!ensureUsername()) {
    showCustomAlert("Please enter your name before starting the timer.");
    return;
  }

  const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
  if (ipcRenderer && !exportFolder) {
    showCustomAlert("Please select an Auto-Export folder before tracking time.");
    const selected = await setupAutoExport();
    if (!selected) return;
  }

  if (clientInput) clientInput.classList.toggle("input-error", !client);
  if (projectInput) projectInput.classList.toggle("input-error", !project);
  if (taskInput) taskInput.classList.toggle("input-error", !task);

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
  saveActiveSession();
  localStorage.setItem(STORAGE_KEY_HEARTBEAT, Date.now().toString());

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (startBtn) startBtn.classList.add("hidden");
  if (pauseBtn) {
    pauseBtn.classList.remove("hidden");
    pauseBtn.innerHTML = "⏸";
    pauseBtn.title = "Pause Timer";
  }
  if (stopBtn) stopBtn.classList.remove("hidden");

  timerInterval = setInterval(updateDisplay, 1000);
  updateDisplay();
}

function stopTimer() {
  if (!activeSession) return;

  if (document.body.classList.contains("mini-mode")) {
    restoreWindow();
  }

  const clientInput = document.getElementById("clientInput");
  const projectInput = document.getElementById("projectInput");
  const taskInput = document.getElementById("taskInput");
  const timerDisplay = document.getElementById("timerDisplay");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  const finalClient = clientInput ? clientInput.value.trim() : "";
  const finalProject = projectInput ? projectInput.value.trim() : "";
  const finalTask = taskInput ? taskInput.value.trim() : "";

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
  saveLogs();

  activeSession = null;
  isPaused = false;
  pausedTimeAcc = 0;
  pauseStartTime = null;
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
  localStorage.removeItem(STORAGE_KEY_HEARTBEAT);

  if (projectInput) {
    projectInput.disabled = false;
    projectInput.value = "";
  }
  if (taskInput) {
    taskInput.disabled = false;
    taskInput.value = "";
  }
  if (timerDisplay) timerDisplay.textContent = "00:00:00";

  if (pauseBtn) pauseBtn.classList.add("hidden");
  if (stopBtn) stopBtn.classList.add("hidden");
  if (startBtn) startBtn.classList.remove("hidden");

  updateProjectList();
  updateClientList();
  renderLogs();

  isExportDirty = true;
  checkAutoExport();
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
  saveLogs();

  activeSession = null;
  isPaused = false;
  pausedTimeAcc = 0;
  pauseStartTime = null;
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
  localStorage.removeItem(STORAGE_KEY_HEARTBEAT);

  const timerDisplay = document.getElementById("timerDisplay");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (timerDisplay) timerDisplay.textContent = "00:00:00";
  if (pauseBtn) pauseBtn.classList.add("hidden");
  if (stopBtn) stopBtn.classList.add("hidden");
  if (startBtn) startBtn.classList.remove("hidden");

  renderLogs();
  isExportDirty = true;
  checkAutoExport();
}
