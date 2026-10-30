// --- CSV Formatting & Security Utilities ---
function escapeHTML(str) {
  return String(str || "").replace(
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

// Escapes formula injection characters (=, +, -, @, tab, cr) to prevent spreadsheet exploits
function escapeCSVCell(str) {
  if (!str) return '""';
  const text = String(str).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(text)) {
    return `"'${text}"`;
  }
  return `"${text}"`;
}

function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getUniqueFileTag() {
  const user = (currentUsername || (systemInfo && systemInfo.osUsername) || "User").trim();
  const host = ((systemInfo && systemInfo.hostname) || "").trim();
  const cleanUser = user.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanHost = host.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (cleanHost && cleanHost.toLowerCase() !== cleanUser.toLowerCase()) {
    return `${cleanUser}_${cleanHost}`;
  }
  return cleanUser;
}

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

// --- Auto-Export Handlers ---
function updateAutoExportButtonState(status = null, message = null) {
  const autoExportBtn = document.getElementById("autoExportBtn");
  if (!ipcRenderer || !autoExportBtn) return;
  const folder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
  autoExportBtn.classList.remove("active", "warning", "error");

  if (!folder) {
    autoExportBtn.classList.add("warning");
    autoExportBtn.innerHTML = "⚠️ Set Export Folder";
    autoExportBtn.title = "Auto-export folder is not configured. Click to set folder.";
    return;
  }

  if (status === "network-offline") {
    autoExportBtn.classList.add("warning");
    autoExportBtn.innerHTML = "⚠️ Network Offline";
    autoExportBtn.title = message || "Network folder is unreachable. Timesheet is saved locally. Will retry when connected.";
  } else if (status === "error") {
    autoExportBtn.classList.add("error");
    autoExportBtn.innerHTML = "❌ Auto-Export Failed";
    autoExportBtn.title = message || "Auto-export failed. Click to re-select folder.";
  } else {
    autoExportBtn.classList.add("active");
    autoExportBtn.innerHTML = "✅ Auto-Export Active";
    autoExportBtn.title = `Auto-export active. Target: ${folder}`;
  }
}

async function setupAutoExport() {
  if (!ipcRenderer) return false;

  const folderPath = await ipcRenderer.invoke("select-folder");

  if (folderPath) {
    localStorage.setItem(STORAGE_KEY_EXPORT_FOLDER, folderPath);
    updateAutoExportButtonState();
    isExportDirty = true;
    await checkAutoExport(true);
    return true;
  }
  return false;
}

function resetExportFolderToDefault() {
  if (systemInfo && systemInfo.defaultExportFolder) {
    localStorage.setItem(STORAGE_KEY_EXPORT_FOLDER, systemInfo.defaultExportFolder);
    updateAutoExportButtonState();
    showCustomAlert(`Auto-export folder reset to server default:\n${systemInfo.defaultExportFolder}`);
    isExportDirty = true;
    checkAutoExport(true);
  } else {
    showCustomAlert("No default server export folder is configured in the environment.");
  }
}

async function checkAutoExport(force = false) {
  const exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
  if (!exportFolder || logs.length === 0) {
    updateAutoExportButtonState();
    return false;
  }

  const now = new Date();
  const todayDateStr = getLocalDateString(now);
  const lastExportDate = localStorage.getItem(STORAGE_KEY_LAST_EXPORT);
  const isPastDeadline = now.getHours() >= deadlineHour;
  const needsDailyExport = isPastDeadline && (lastExportDate !== todayDateStr);

  if (!force && !isExportDirty && !needsDailyExport) {
    return true;
  }

  saveUsername();

  // Filter logs for today's local date
  const todayLogs = logs.filter((log) => {
    const startStr = getLocalDateString(log.startTime);
    const endStr = log.endTime ? getLocalDateString(log.endTime) : startStr;
    return startStr === todayDateStr || endStr === todayDateStr;
  });
  const logsToExport = todayLogs.length > 0 ? todayLogs : logs;
  const csvContent = getCSVContent(logsToExport);

  const fileTag = getUniqueFileTag();
  const fileName = `Daily_Timesheet_${fileTag}_${todayDateStr}.csv`;

  try {
    const res = await window.electronAPI.invoke("save-csv-auto", {
      folderPath: exportFolder,
      fileName,
      csvContent,
    });

    if (res && res.success) {
      isExportDirty = false;
      localStorage.setItem(STORAGE_KEY_LAST_EXPORT, todayDateStr);
      updateAutoExportButtonState("active");
      return true;
    } else if (res && res.networkError) {
      isExportDirty = true;
      const backupMessage = res.localBackupPath
        ? "Timesheet backed up locally."
        : `Local backup also failed: ${res.localBackupError || "backup location unavailable."}`;
      updateAutoExportButtonState("network-offline", `Network folder offline: ${res.error}. ${backupMessage}`);
      return false;
    } else {
      console.error("Auto-export failed:", res ? res.error : "Unknown error");
      updateAutoExportButtonState("error", res && res.error ? res.error : "Cannot write to export folder");
      return false;
    }
  } catch (err) {
    console.error("Auto-export invocation error:", err);
    updateAutoExportButtonState("error", err.message || err);
    return false;
  }
}

async function exportCSV() {
  const btn = document.getElementById("exportBtn");
  if (logs.length === 0) {
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = "No data to export";
      btn.style.backgroundColor = "var(--text-muted)";
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.backgroundColor = "";
      }, 2000);
    }
    return;
  }

  saveUsername();
  const csvContent = getCSVContent();

  const startDateStr = getLocalDateString(logs[logs.length - 1].startTime);
  const endDateStr = getLocalDateString(logs[0].startTime);
  const fileTag = getUniqueFileTag();
  const fileName = `Timesheet_${fileTag}_${startDateStr}_to_${endDateStr}.csv`;

  if (!ipcRenderer) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  let exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
  if (!exportFolder) {
    const selected = await setupAutoExport();
    if (!selected) return;
    exportFolder = localStorage.getItem(STORAGE_KEY_EXPORT_FOLDER);
  }

  try {
    const result = await ipcRenderer.invoke("save-csv-auto", {
      folderPath: exportFolder,
      fileName,
      csvContent,
    });

    if (result && result.success) {
      updateAutoExportButtonState("active");
      showCustomAlert(`Timesheet exported to:\n${result.filePath}`);
    } else if (result && result.networkError) {
      const backupMessage = result.localBackupPath
        ? `A local backup was saved at:\n${result.localBackupPath}`
        : `The local backup also failed: ${result.localBackupError || "backup location unavailable."}`;
      updateAutoExportButtonState(
        "network-offline",
        `Network folder offline: ${result.error}. ${backupMessage}`,
      );
      showCustomAlert(
        `The network export failed: ${result.error}\n${backupMessage}`,
      );
    } else {
      const error = result && result.error ? result.error : "Unknown export error.";
      updateAutoExportButtonState("error", error);
      showCustomAlert(`Timesheet export failed: ${error}`);
    }
  } catch (error) {
    console.error("Manual CSV export failed:", error);
    updateAutoExportButtonState("error", error.message || error);
    showCustomAlert(`Timesheet export failed: ${error.message || error}`);
  }
}
