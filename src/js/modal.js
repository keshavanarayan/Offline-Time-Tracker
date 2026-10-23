// --- Modal Dialog Utilities ---
function showCustomAlert(message, callback) {
  const modalMessage = document.getElementById("modalMessage");
  const modalActions = document.getElementById("modalActions");
  const customModal = document.getElementById("customModal");

  if (!customModal || !modalMessage || !modalActions) return;

  modalMessage.textContent = message;
  modalActions.innerHTML = '<button class="btn btn-start btn-modal" id="modalOkBtn">OK</button>';
  customModal.classList.remove("hidden");

  document.getElementById("modalOkBtn").onclick = () => {
    customModal.classList.add("hidden");
    if (callback) callback();
  };
}

function showCustomConfirm(message, callback) {
  const modalMessage = document.getElementById("modalMessage");
  const modalActions = document.getElementById("modalActions");
  const customModal = document.getElementById("customModal");

  if (!customModal || !modalMessage || !modalActions) return;

  modalMessage.textContent = message;
  modalActions.innerHTML = `
    <button class="btn btn-stop btn-modal" id="modalNoBtn">No</button>
    <button class="btn btn-start btn-modal" id="modalYesBtn">Yes</button>
  `;
  customModal.classList.remove("hidden");

  document.getElementById("modalNoBtn").onclick = () => {
    customModal.classList.add("hidden");
    callback(false);
  };
  document.getElementById("modalYesBtn").onclick = () => {
    customModal.classList.add("hidden");
    callback(true);
  };
}

function showTimePickerModal(currentHour, callback) {
  const modalMessage = document.getElementById("modalMessage");
  const modalActions = document.getElementById("modalActions");
  const customModal = document.getElementById("customModal");

  if (!customModal || !modalMessage || !modalActions) return;

  modalMessage.textContent = "Select Closing Deadline Time:";

  let selectOptions = "";
  for (let h = 0; h < 24; h++) {
    const label = formatHour12(h);
    const selected = h === currentHour ? "selected" : "";
    selectOptions += `<option value="${h}" ${selected}>${label}</option>`;
  }

  modalActions.innerHTML = `
    <div class="modal-time-wrapper">
      <select id="deadlineTimeSelect" class="input-field modal-time-select">
        ${selectOptions}
      </select>
      <div class="modal-btn-row">
        <button class="btn btn-stop btn-modal" id="modalCancelTimeBtn">Cancel</button>
        <button class="btn btn-start btn-modal" id="modalSaveTimeBtn">Save Deadline</button>
      </div>
    </div>
  `;
  customModal.classList.remove("hidden");

  document.getElementById("modalCancelTimeBtn").onclick = () => {
    customModal.classList.add("hidden");
    callback(null);
  };
  document.getElementById("modalSaveTimeBtn").onclick = () => {
    const selectedVal = parseInt(document.getElementById("deadlineTimeSelect").value, 10);
    customModal.classList.add("hidden");
    callback(selectedVal);
  };
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

// --- Interactive Tutorial Spotlight Tour ---
let currentTutorialStep = 0;
const TUTORIAL_STEPS = [
  {
    target: "#usernameInput",
    title: "1. Employee Name",
    content: "Enter your name here. All exported CSV timesheets will tag your entries with this name.",
  },
  {
    target: ".timer-section",
    title: "2. Track Client Tasks",
    content: "Select or type your <strong>Client Name</strong>, <strong>Project Name</strong>, and <strong>Task</strong>, then click <strong>▶</strong> to start tracking.",
  },
  {
    target: ".title-bar-controls .control-btn.minimize",
    title: "3. Floating Mini Mode",
    content: "Click <strong>-</strong> (or press <strong>Ctrl+Alt+M</strong>) while a timer is running to shrink into a floating mini window on your screen.",
  },
  {
    target: "#autoExportBtn",
    title: "4. Auto-Export Location",
    content: "Click here to set your auto-export folder (can be a <strong>local folder</strong> or a <strong>shared LAN drive</strong>).",
  },
  {
    target: "#advancedSettingsDropdown",
    title: "5. Settings & Shutdown",
    content: "Access your closing deadline, manual export, tutorial, and silent shutdown options here.",
  },
];

function openTutorial() {
  currentTutorialStep = 0;
  const overlay = document.getElementById("tutorialOverlay");
  const popover = document.getElementById("tutorialPopover");

  if (!overlay || !popover) return;

  overlay.classList.remove("hidden");
  popover.classList.remove("hidden");
  renderTutorialStep();
}

function closeTutorial() {
  const overlay = document.getElementById("tutorialOverlay");
  const popover = document.getElementById("tutorialPopover");

  if (overlay) overlay.classList.add("hidden");
  if (popover) popover.classList.add("hidden");

  document.querySelectorAll(".tutorial-highlight").forEach((el) => {
    el.classList.remove("tutorial-highlight");
  });

  localStorage.setItem(STORAGE_KEY_TUTORIAL, "true");
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[currentTutorialStep];
  const stepIndicator = document.getElementById("tutorialStepIndicator");
  const title = document.getElementById("tutorialTitle");
  const body = document.getElementById("tutorialBody");
  const prevBtn = document.getElementById("tutorialPrevBtn");
  const nextBtn = document.getElementById("tutorialNextBtn");
  const popover = document.getElementById("tutorialPopover");

  if (!step || !popover) return;

  document.querySelectorAll(".tutorial-highlight").forEach((el) => {
    el.classList.remove("tutorial-highlight");
  });

  if (stepIndicator) stepIndicator.textContent = `Step ${currentTutorialStep + 1} of ${TUTORIAL_STEPS.length}`;
  if (title) title.textContent = step.title;
  if (body) body.innerHTML = step.content;

  if (prevBtn) {
    if (currentTutorialStep === 0) {
      prevBtn.classList.add("hidden");
    } else {
      prevBtn.classList.remove("hidden");
    }
  }

  if (nextBtn) {
    if (currentTutorialStep === TUTORIAL_STEPS.length - 1) {
      nextBtn.textContent = "Finish";
    } else {
      nextBtn.textContent = "Next";
    }
  }

  const targetEl = document.querySelector(step.target);
  if (targetEl) {
    targetEl.classList.add("tutorial-highlight");
    targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    positionTutorialPopover(targetEl);
  } else {
    popover.style.top = "50%";
    popover.style.left = "50%";
    popover.style.transform = "translate(-50%, -50%)";
  }
}

function positionTutorialPopover(targetEl) {
  const popover = document.getElementById("tutorialPopover");
  if (!popover || !targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const popoverWidth = 320;
  const popoverHeight = 180;
  const margin = 12;

  let top = rect.bottom + margin;
  let left = rect.left + rect.width / 2 - popoverWidth / 2;

  if (top + popoverHeight > window.innerHeight) {
    top = rect.top - popoverHeight - margin;
  }
  if (left < margin) {
    left = margin;
  } else if (left + popoverWidth > window.innerWidth - margin) {
    left = window.innerWidth - popoverWidth - margin;
  }

  popover.style.top = `${Math.max(margin, top)}px`;
  popover.style.left = `${Math.max(margin, left)}px`;
  popover.style.transform = "none";
}

function nextTutorialStep() {
  if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
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
