const PROFILE_KEY = "iismProfile";
const DB_NAME = "iism-form-assistant";
const DB_VERSION = 1;
const STORE_NAME = "documents";
const MAX_FILE_BYTES = 500 * 1024;
const BACKUP_APP_ID = "iism-autofil";
const BACKUP_VERSION = 1;
const SYNC_PREF_KEY = "iismSyncEnabled";
const FILE_FIELD_LABELS = {
  birthCertificate: "Date-of-birth proof",
  domicileProof: "Domicile proof",
  educationProof: "Education proof",
  skiCertificate: "Skiing certificate",
  currentEmployment: "Current employment proof",
  applicantPhoto: "Applicant photo",
  applicantSignature: "Applicant signature",
  parentGuardianSignature: "Parent / guardian signature"
};
const IMAGE_ONLY_UPLOADS = new Set([
  "birthCertificate",
  "educationProof",
  "applicantPhoto",
  "applicantSignature",
  "parentGuardianSignature"
]);
const REQUIRED_UPLOADS = new Set([
  "birthCertificate",
  "educationProof",
  "applicantPhoto",
  "applicantSignature"
]);
const IMAGE_MIME_ALIASES = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png"
};
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf"
};

// Infer a MIME type from the file name when the browser reports none.
function resolveFileType(name, type) {
  const mime = String(type || "").trim().toLowerCase();
  if (IMAGE_MIME_ALIASES[mime]) return IMAGE_MIME_ALIASES[mime];
  if (mime && mime !== "application/octet-stream") return mime;
  const extension = (/\.([a-z0-9]+)$/i.exec(String(name || "")) || [])[1];
  return MIME_BY_EXTENSION[String(extension || "").toLowerCase()] || "application/octet-stream";
}

function isAllowedForIismField(key, file) {
  if (!IMAGE_ONLY_UPLOADS.has(key)) return true;
  const extension = (/\.([a-z0-9]+)$/i.exec(String(file.name || "")) || [])[1]?.toLowerCase();
  const mime = resolveFileType(file.name, file.type);
  return ["jpg", "jpeg", "png"].includes(extension) &&
    ALLOWED_IMAGE_MIME_TYPES.has(mime);
}

function formatRequirementForField(key) {
  return IMAGE_ONLY_UPLOADS.has(key)
    ? "IISM requires a JPG/JPEG/PNG image here (maximum 500 KB). Convert the PDF to an image, then choose it again."
    : "Choose a file type accepted by the IISM form (maximum 500 KB).";
}

const COURSE_LEVELS = {
  "Snow Skiing course at gulmarg": [
    "Basic SSC",
    "Intermediate SSC",
    "Advance SSC",
    "Snow Boarding"
  ],
  "Snow Skiing course at Kargil": [
    "Basic Skiing course",
    "Intermediate Skiing Course",
    "Advance skiing course"
  ],
  "MOI course at gulmarg": []
};

const sections = [
  {
    title: "Course details",
    fields: [
      ["courseName", "Course", "", "select", Object.keys(COURSE_LEVELS)],
      ["courseLevel", "Course level", "Options depend on the course you choose. MOI course has no course level.", "select", []],
      ["scheduleCourse", "Course schedule"],
      ["state", "State"]
    ],
    help: "Course level choices change with the course you pick. The schedule of course list loads once admissions open."
  },
  {
    title: "Basic details",
    fields: [
      ["name", "Applicant name"],
      ["fatherName", "Father's name"],
      ["nationality", "Nationality"],
      ["dateOfBirth", "Date of birth", "Choose a date.", "date"],
      ["birthCertificate", "Date-of-birth proof", "JPG/JPEG/PNG only, maximum 500 KB (IISM requirement)", "file"],
      ["domicile", "Domicile"],
      ["domicileProof", "Domicile proof", "Any file type, maximum 500 KB", "file"]
    ]
  },
  {
    title: "Permanent address and contact",
    fields: [
      ["houseNoApartment", "House number / apartment"],
      ["streetVillageColony", "Street / village / colony"],
      ["districtCity", "District / city"],
      ["pincode", "PIN code"],
      ["mobileNo", "Mobile number"],
      ["emailId", "Email address"]
    ]
  },
  {
    title: "Academic details",
    fields: [
      ["educationQualification", "Education qualification", "", "select", [
        "High School",
        "Intermediate",
        "Graduation",
        "Post graduation"
      ]],
      ["educationProof", "Education proof", "JPG/JPEG/PNG only, maximum 500 KB (IISM requirement)", "file"],
      ["skiCertificate", "Basic / intermediate skiing certificate", "Any file type, maximum 500 KB", "file"],
      ["currentEmployment", "Current employment proof", "Any file type, maximum 500 KB", "file"]
    ]
  },
  {
    title: "Identification and medical details",
    fields: [
      ["vegetarianOrNon", "Vegetarian / non-vegetarian", "", "select", [
        "Vegetarian",
        "Non-Vegetarian"
      ]],
      ["bloodGroup", "Blood group"],
      ["medicalCategory", "Medical category"],
      ["height", "Height"],
      ["weight", "Weight"],
      ["waist", "Waist"],
      ["shoeSize", "Shoe size"]
    ]
  },
  {
    title: "Photo and signatures",
    fields: [
      ["applicantPhoto", "Applicant photo", "JPG/JPEG/PNG only, maximum 500 KB (IISM requirement)", "file"],
      ["applicantSignature", "Applicant signature", "JPG/JPEG/PNG only, maximum 500 KB (IISM requirement)", "file"]
    ]
  },
  {
    title: "Indemnity bond",
    fields: [
      ["emergencyContactName", "Emergency contact name"],
      ["emergencyContactPhone", "Emergency contact phone"],
      ["parentGuardianSignature", "Parent / guardian signature", "For applicants under 18; JPG/JPEG/PNG only, maximum 500 KB", "file"]
    ]
  }
];

const FIELD_VALIDATION = IISMFieldValidation.rules;

const form = document.querySelector("#profileForm");
const sectionsRoot = document.querySelector("#profileSections");
const pageNotice = document.querySelector("#pageNotice");
const fillStatus = document.querySelector("#fillStatus");
const fillButton = document.querySelector("#fillButton");
const clearButton = document.querySelector("#clearButton");
const exportButton = document.querySelector("#exportButton");
const shareButton = document.querySelector("#shareButton");
const importButton = document.querySelector("#importButton");
const importFileInput = document.querySelector("#importFileInput");
const syncOption = document.querySelector("#syncOption");
const syncToggle = document.querySelector("#syncToggle");
const inputs = new Map();
const validationMessages = new Map();
const fileSaveTasks = new Map();
let saveTimer;
let databasePromise;
let profileReady = false;
let profileLoadError = false;
let syncEnabled = false;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function documentTransaction(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function updateFieldValidation(key, input) {
  const rule = FIELD_VALIDATION.get(key);
  if (!rule) return true;
  const value = input.value.trim();
  const invalid = value !== "" && !IISMFieldValidation.isValid(key, value);
  const message = invalid ? rule.message : "";
  input.setCustomValidity(message);
  input.setAttribute("aria-invalid", String(invalid));
  const feedback = validationMessages.get(key);
  if (feedback) {
    feedback.textContent = message;
    feedback.hidden = !invalid;
  }
  return !invalid;
}

function renderSelectChoices(select, choices) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select";
  select.replaceChildren(placeholder);
  for (const choice of choices) {
    const option = document.createElement("option");
    option.value = choice;
    option.textContent = choice;
    select.append(option);
  }
}

function syncCourseLevelOptions() {
  const courseSelect = inputs.get("courseName");
  const levelSelect = inputs.get("courseLevel");
  if (!courseSelect || !levelSelect) return;
  const choices = COURSE_LEVELS[courseSelect.value] || [];
  const previous = levelSelect.value;
  renderSelectChoices(levelSelect, choices);
  levelSelect.value = choices.includes(previous) ? previous : "";
  levelSelect.disabled = choices.length === 0;
}

function renderFields() {
  sections.forEach((section, sectionIndex) => {
    const sectionElement = document.createElement("section");
    sectionElement.className = "section";
    const heading = document.createElement("h2");
    const content = document.createElement("div");
    const contentId = `profile-section-content-${sectionIndex}`;
    const toggle = document.createElement("button");
    const title = document.createElement("span");
    const chevron = document.createElement("span");

    content.id = contentId;
    content.className = "section-content";
    toggle.className = "section-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-controls", contentId);
    title.textContent = section.title;
    chevron.className = "section-chevron";
    chevron.setAttribute("aria-hidden", "true");
    toggle.append(title, chevron);
    heading.append(toggle);
    sectionElement.append(heading, content);
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      content.hidden = expanded;
      sectionElement.classList.toggle("is-collapsed", expanded);
    });

    if (section.help) {
      const help = document.createElement("span");
      help.className = "field-help";
      help.textContent = section.help;
      content.append(help);
    }

    for (const [key, labelText, helpText, kind, choices] of section.fields) {
      const label = document.createElement("label");
      label.className = "field";
      const labelSpan = document.createElement("span");
      labelSpan.className = "field-label";
      labelSpan.textContent = labelText;
      label.append(labelSpan);

      const input = kind === "select"
        ? document.createElement("select")
        : document.createElement("input");
      input.id = `profile-${key}`;
      input.name = key;
      input.dataset.key = key;
      if (kind === "file") {
        input.type = "file";
        if (IMAGE_ONLY_UPLOADS.has(key)) input.accept = ".jpg,.jpeg,.png,image/jpeg,image/png";
        input.setAttribute("aria-label", labelText);
        input.addEventListener("change", () => {
          const task = saveDocument(key, input);
          fileSaveTasks.set(key, task);
          task.finally(() => {
            if (fileSaveTasks.get(key) === task) fileSaveTasks.delete(key);
          });
        });
        const state = document.createElement("span");
        state.className = "file-state";
        state.id = `file-state-${key}`;
        const removeButton = document.createElement("button");
        removeButton.className = "remove-file";
        removeButton.type = "button";
        removeButton.textContent = "Remove saved file";
        removeButton.hidden = true;
        removeButton.addEventListener("click", () => removeDocument(key, input));
        label.append(input, state, removeButton);
        if (helpText) {
          const help = document.createElement("span");
          help.className = "field-help";
          help.textContent = helpText;
          label.append(help);
        }
        inputs.set(key, input);
        content.append(label);
        continue;
      }

      if (kind === "select") {
        renderSelectChoices(input, choices);
        input.addEventListener("change", () => {
          if (key === "courseName") syncCourseLevelOptions();
          scheduleSave();
        });
      } else {
        input.type = kind === "date" ? "date" : "text";
        input.autocomplete = kind === "date" ? "bday" : "on";
        const rule = FIELD_VALIDATION.get(key);
        if (rule) {
          input.pattern = rule.pattern;
          input.title = rule.message;
          const feedback = document.createElement("span");
          feedback.className = "validation-message";
          feedback.id = `validation-${key}`;
          feedback.setAttribute("role", "alert");
          feedback.hidden = true;
          input.setAttribute("aria-describedby", feedback.id);
          validationMessages.set(key, feedback);
          input.addEventListener("input", () => {
            updateFieldValidation(key, input);
            scheduleSave();
          });
        } else {
          input.addEventListener("input", scheduleSave);
        }
      }
      inputs.set(key, input);
      label.append(input);
      if (validationMessages.has(key)) label.append(validationMessages.get(key));
      if (helpText) {
        const help = document.createElement("span");
        help.className = "field-help";
        help.textContent = helpText;
        label.append(help);
      }
      content.append(label);
    }

    sectionsRoot.append(sectionElement);
  });
}

function readProfileFromForm() {
  const profile = {};
  for (const [key, input] of inputs) {
    if (input.type !== "file") profile[key] = input.value.trim();
  }
  return profile;
}

async function saveProfile() {
  try {
    const profile = readProfileFromForm();
    await chrome.storage.local.set({ [PROFILE_KEY]: profile });
    if (syncEnabled) await writeSyncedProfile(profile);
  } catch {
    pageNotice.textContent = "Could not save profile. Check available browser storage.";
    pageNotice.dataset.state = "error";
  }
}

function syncAvailable() {
  return Boolean(chrome.storage.sync);
}

async function writeSyncedProfile(profile) {
  try {
    await chrome.storage.sync.set({ [PROFILE_KEY]: profile });
  } catch {
    pageNotice.textContent = "Saved on this computer, but Chrome could not sync it to your Google account.";
    pageNotice.dataset.state = "error";
  }
}

async function setSyncEnabled(enabled) {
  syncEnabled = enabled;
  syncToggle.checked = enabled;
  try {
    await chrome.storage.local.set({ [SYNC_PREF_KEY]: enabled });
    if (enabled) {
      await chrome.storage.sync.set({ [PROFILE_KEY]: readProfileFromForm() });
      pageNotice.textContent = "Sync is on. Another computer using the same Google account will now get these details. Documents still move only with a backup file.";
      pageNotice.dataset.state = "success";
    } else {
      await chrome.storage.sync.remove(PROFILE_KEY);
      pageNotice.textContent = "Sync is off and the copy in your Google account was deleted. Your details stay on this computer only.";
      pageNotice.dataset.state = "success";
    }
  } catch {
    syncEnabled = !enabled;
    syncToggle.checked = !enabled;
    pageNotice.textContent = "Chrome could not change the sync setting. Check that you are signed in to Chrome with sync turned on.";
    pageNotice.dataset.state = "error";
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProfile, 250);
}

async function saveDocument(key, input) {
  const state = document.querySelector(`#file-state-${key}`);
  const file = input.files?.[0];
  if (!file) return;

  if (!isAllowedForIismField(key, file)) {
    input.value = "";
    state.textContent = `This selection was not saved. ${formatRequirementForField(key)} Any previously saved file remains unchanged.`;
    state.dataset.state = "error";
    return;
  }

  if (file.size > MAX_FILE_BYTES) {
    input.value = "";
    state.textContent = `This selection is ${Math.ceil(file.size / 1024)} KB and was not saved. Files must be 500 KB or smaller. Any previously saved file remains unchanged.`;
    state.dataset.state = "error";
    return;
  }

  try {
    await documentTransaction("readwrite", (store) => store.put({
      blob: file,
      name: file.name,
      type: resolveFileType(file.name, file.type),
      size: file.size
    }, key));
    state.textContent = `Saved locally: ${file.name}`;
    state.dataset.state = "success";
    state.nextElementSibling.hidden = false;
  } catch {
    state.textContent = "Could not save this file in local browser storage.";
    state.dataset.state = "error";
  }
}

async function loadSavedData() {
  try {
    const stored = await chrome.storage.local.get([PROFILE_KEY, SYNC_PREF_KEY]);
    syncEnabled = syncAvailable() && stored[SYNC_PREF_KEY] === true;
    syncToggle.checked = syncEnabled;
    let profile = stored[PROFILE_KEY] || {};
    if (syncEnabled) {
      const synced = (await chrome.storage.sync.get(PROFILE_KEY))[PROFILE_KEY];
      if (synced && typeof synced === "object") {
        profile = synced;
        await chrome.storage.local.set({ [PROFILE_KEY]: synced });
      } else {
        await chrome.storage.sync.set({ [PROFILE_KEY]: profile });
      }
    }
    applyProfileToInputs(profile);
    await refreshSavedFileStates();
  } catch {
    profileLoadError = true;
    pageNotice.textContent = "Local profile storage is unavailable in this browser.";
    pageNotice.dataset.state = "error";
  } finally {
    profileReady = true;
    await updatePageNotice();
  }
}

function applyProfileToInputs(profile) {
  for (const [key, input] of inputs) {
    if (input.type === "file") continue;
    input.value = key === "dateOfBirth"
      ? toDatePickerValue(profile[key] || "")
      : profile[key] || "";
    if (key === "courseName") syncCourseLevelOptions();
    updateFieldValidation(key, input);
  }
}

async function refreshSavedFileStates() {
  for (const [key, input] of inputs) {
    if (input.type !== "file") continue;
    const state = document.querySelector(`#file-state-${key}`);
    if (!state) continue;
    const saved = await documentTransaction("readonly", (store) => store.get(key));
    if (saved) {
      state.textContent = `Saved locally: ${saved.name}`;
      state.dataset.state = "success";
      state.nextElementSibling.hidden = false;
    } else {
      state.textContent = "";
      delete state.dataset.state;
      state.nextElementSibling.hidden = true;
    }
  }
}

function toDatePickerValue(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

async function getActiveIismTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url) return null;
  try {
    const url = new URL(tab.url);
    if (url.origin !== "https://admission.iismgulmarg.in" ||
        url.pathname.toLowerCase() !== "/admission_form.aspx") return null;
  } catch {
    return null;
  }
  return tab;
}

async function sendToPage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function showResults(results) {
  fillStatus.replaceChildren();
  const entries = results.map((message) => ({
    message,
    state: message.startsWith("Could not") || message.startsWith("Skipped")
      ? "error"
      : message.startsWith("Declaration") || message.startsWith("Green confirms")
        ? "info"
        : "success"
  }));
  const failures = entries.filter((entry) => entry.state === "error").length;
  const successes = entries.filter((entry) => entry.state === "success").length;
  const summary = document.createElement("p");
  summary.className = "status-summary";
  summary.textContent = failures
    ? `Form update finished: ${successes} items filled or selected; ${failures} need attention.`
    : `Form update finished: ${successes} items filled or selected. Review the form before submitting.`;
  fillStatus.append(summary);

  const list = document.createElement("ul");
  for (const entry of entries) {
    const line = document.createElement("li");
    line.className = `status-item status-item-${entry.state}`;
    line.textContent = entry.message;
    list.append(line);
  }
  fillStatus.append(list);
  fillStatus.dataset.state = failures ? "mixed" : "success";
}

async function fillOpenForm() {
  fillButton.disabled = true;
  fillStatus.textContent = "";
  try {
    const tab = await getActiveIismTab();
    if (!tab) {
      pageNotice.textContent = "Open the official IISM admission form in the active tab first.";
      pageNotice.dataset.state = "error";
      return;
    }

    const invalidInputs = [];
    for (const [key, rule] of FIELD_VALIDATION) {
      const input = inputs.get(key);
      if (input && !updateFieldValidation(key, input)) invalidInputs.push(input);
    }
    if (invalidInputs.length) {
      fillStatus.textContent = `Correct ${invalidInputs.length} highlighted field${invalidInputs.length === 1 ? "" : "s"} before filling.`;
      fillStatus.dataset.state = "error";
      const firstInvalid = invalidInputs[0];
      for (const input of invalidInputs) {
        const section = input.closest(".section");
        const toggle = section?.querySelector(".section-toggle");
        if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
      }
      firstInvalid.focus();
      return;
    }

    await saveProfile();
    const reply = await sendToPage(tab.id, {
      type: "iism-fill-profile",
      profile: readProfileFromForm()
    });
    if (!reply?.ok) throw new Error(reply?.error || "The IISM page did not respond.");
    const results = [...reply.results];

    await Promise.all(fileSaveTasks.values());
    await waitForFormSettled(tab.id);

    const uploadQueue = [];
    for (const [key, input] of inputs) {
      if (input.type !== "file") continue;
      const saved = await documentTransaction("readonly", (store) => store.get(key));
      if (!saved) {
        if (REQUIRED_UPLOADS.has(key)) {
          results.push(`Could not attach ${FILE_FIELD_LABELS[key]}: no file is saved. Choose a JPG/JPEG/PNG image up to 500 KB.`);
        }
        continue;
      }
      if (!isAllowedForIismField(key, saved)) {
        results.push(`Could not attach ${FILE_FIELD_LABELS[key]} (${saved.name}): ${formatRequirementForField(key)}`);
        continue;
      }
      uploadQueue.push({
        key,
        dataUrl: await blobToDataUrl(saved.blob),
        fileName: saved.name,
        fileType: saved.type,
        maxFileBytes: MAX_FILE_BYTES
      });
    }

    await attachFilesInBatch(tab.id, uploadQueue, results);
    results.push("Green confirms fields were filled or files are selected in the browser. Only IISM can confirm receipt after you submit.");
    showResults(results);
  } catch (error) {
    fillStatus.textContent = `Could not fill the page: ${error.message}. Confirm the form is open and try again.`;
    fillStatus.dataset.state = "error";
  } finally {
    await updatePageNotice();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read the saved file."));
    reader.readAsDataURL(blob);
  });
}

// Wait until the IISM page has finished any postback the field changes kicked off.
// The page stays idle (document ready and no ASP.NET postback) for a short, steady
// window before we consider it settled, so we never race a re-render.
async function waitForFormSettled(tabId, { timeoutMs = 15000, intervalMs = 150, stableMs = 600 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let idleSince = 0;
  for (;;) {
    let busy = false;
    try {
      const [probe] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: IISMPageFileAttachment.isFormBusy
      });
      busy = Boolean(probe?.result);
    } catch {
      // The page may be mid-navigation; treat that as busy and keep waiting.
      busy = true;
    }

    const now = Date.now();
    if (busy) {
      idleSince = 0;
    } else if (!idleSince) {
      idleSince = now;
    } else if (now - idleSince >= stableMs) {
      return;
    }
    if (now >= deadline) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// Set every queued file in a single injection, then read the form back and report
// what actually survived on the page instead of assuming the attach worked.
async function attachFilesInBatch(tabId, uploadQueue, results) {
  if (!uploadQueue.length) return;

  let attachments = [];
  try {
    const [response] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: IISMPageFileAttachment.attachFilesToForm,
      args: [uploadQueue]
    });
    attachments = Array.isArray(response?.result) ? response.result : [];
  } catch (error) {
    results.push(`Could not attach files: ${(error && error.message) || "the page did not accept them"}.`);
    return;
  }

  for (const item of attachments) {
    if (item && item.ok === false) {
      results.push(`Could not attach ${FILE_FIELD_LABELS[item.key] || item.key}: ${item.error}`);
    }
  }

  const accepted = attachments.filter((item) => item && item.ok);
  if (!accepted.length) return;

  await waitForFormSettled(tabId);
  await new Promise((resolve) => setTimeout(resolve, 400));

  let verification = null;
  try {
    const [response] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: IISMPageFileAttachment.verifyFilesOnForm,
      args: [accepted.map(({ inputId, name, size }) => ({ inputId, name, size }))]
    });
    if (response?.result) verification = response.result;
  } catch {
    // Leave verification null and report the uncertainty honestly below.
  }

  const missing = new Set((verification?.missing || []).map((item) => item.inputId));
  for (const item of accepted) {
    const label = FILE_FIELD_LABELS[item.key] || item.key;
    if (verification && !missing.has(item.inputId)) {
      results.push(`Selected ${label}: ${item.name}.`);
    } else {
      results.push(`Could not verify ${label}: the form cleared it. Choose the file manually.`);
    }
  }
}

async function removeAllSavedData() {
  const syncNote = syncEnabled ? " This also deletes the copy kept in your Google account." : "";
  if (!window.confirm(`Clear all saved profile details and documents from this browser?${syncNote}`)) return;
  try {
    clearTimeout(saveTimer);
    await Promise.all(fileSaveTasks.values());
    await chrome.storage.local.remove(PROFILE_KEY);
    if (syncEnabled) await chrome.storage.sync.remove(PROFILE_KEY);
    await documentTransaction("readwrite", (store) => store.clear());
    for (const [key, input] of inputs) {
      input.value = "";
      updateFieldValidation(key, input);
      const state = document.querySelector(`#file-state-${key}`);
      if (state) {
        state.textContent = "";
        delete state.dataset.state;
        state.nextElementSibling.hidden = true;
      }
    }
    fillStatus.textContent = "";
    pageNotice.textContent = "Saved profile details and documents were cleared from this browser.";
    pageNotice.dataset.state = "success";
  } catch {
    pageNotice.textContent = "Could not clear all local data. Please try again.";
    pageNotice.dataset.state = "error";
  }
}

async function removeDocument(key, input) {
  const state = document.querySelector(`#file-state-${key}`);
  try {
    await fileSaveTasks.get(key);
    await documentTransaction("readwrite", (store) => store.delete(key));
    input.value = "";
    state.textContent = "No document saved.";
    state.dataset.state = "success";
    state.nextElementSibling.hidden = true;
  } catch {
    state.textContent = "Could not remove this saved file.";
    state.dataset.state = "error";
  }
}

async function buildBackup() {
  clearTimeout(saveTimer);
  await Promise.all(fileSaveTasks.values());
  const documents = {};
  for (const [key, input] of inputs) {
    if (input.type !== "file") continue;
    const saved = await documentTransaction("readonly", (store) => store.get(key));
    if (!saved) continue;
    documents[key] = {
      name: saved.name,
      type: saved.type,
      data: await blobToDataUrl(saved.blob)
    };
  }
  const backup = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: readProfileFromForm(),
    documents
  };
  return {
    count: Object.keys(documents).length,
    filename: `iism-autofil-backup-${new Date().toISOString().slice(0, 10)}.json`,
    blob: new Blob([JSON.stringify(backup)], { type: "application/json" })
  };
}

async function exportBackup() {
  if (!window.confirm("Download a backup file? It contains your personal details and documents. Keep it private.")) return;
  try {
    const { blob, filename, count } = await buildBackup();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    pageNotice.textContent = `Backup downloaded with ${count} document${count === 1 ? "" : "s"}. Attach this file in your email to send it to yourself, then load it on any other computer.`;
    pageNotice.dataset.state = "success";
  } catch {
    pageNotice.textContent = "Could not create a backup file. Please try again.";
    pageNotice.dataset.state = "error";
  }
}

async function shareBackup() {
  try {
    const { blob, filename, count } = await buildBackup();
    const file = new File([blob], filename, { type: "application/json" });
    await navigator.share({
      files: [file],
      title: "IISM Autofil backup",
      text: "IISM Autofil backup. Open it on another computer with the Load backup file button."
    });
    pageNotice.textContent = `Shared ${count} document${count === 1 ? "" : "s"}. If you sent it to your email, open that email on the other computer, download the file, then click Load backup file.`;
    pageNotice.dataset.state = "success";
  } catch (error) {
    if (error.name === "AbortError") return;
    pageNotice.textContent = "The sharing window could not send the file. Use Save backup file instead, then attach the file in your email.";
    pageNotice.dataset.state = "error";
  }
}

async function importBackup(file) {
  try {
    const backup = JSON.parse(await file.text());
    if (!backup || backup.app !== BACKUP_APP_ID || typeof backup.profile !== "object" || backup.profile === null) {
      throw new Error("This file was not created by IISM Autofil.");
    }

    await chrome.storage.local.set({ [PROFILE_KEY]: backup.profile });
    if (syncEnabled) await writeSyncedProfile(backup.profile);
    applyProfileToInputs(backup.profile);

    let restored = 0;
    const skipped = [];
    for (const [key, input] of inputs) {
      if (input.type !== "file") continue;
      const document_ = backup.documents?.[key];
      if (!document_?.data || typeof document_.data !== "string") continue;
      const blob = dataUrlToBlob(document_.data);
      const name = typeof document_.name === "string" && document_.name ? document_.name : "document";
      if (blob.size > MAX_FILE_BYTES || !isAllowedForIismField(key, { name, type: blob.type })) {
        skipped.push(FILE_FIELD_LABELS[key] || key);
        continue;
      }
      await documentTransaction("readwrite", (store) => store.put({
        blob,
        name,
        type: resolveFileType(name, blob.type),
        size: blob.size
      }, key));
      restored++;
    }

    await refreshSavedFileStates();
    pageNotice.textContent = skipped.length
      ? `Backup loaded with ${restored} document(s). These files are not accepted by the IISM form, so choose them again: ${skipped.join(", ")}.`
      : `Backup loaded with ${restored} document${restored === 1 ? "" : "s"}. Check every detail before you fill the IISM form.`;
    pageNotice.dataset.state = skipped.length ? "error" : "success";
  } catch (error) {
    pageNotice.textContent = `Could not load that backup file. ${error.message}`;
    pageNotice.dataset.state = "error";
  }
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;,]*)(;base64)?,/.exec(dataUrl);
  if (!match) throw new Error("The backup contains an unreadable document.");
  const binary = atob(dataUrl.slice(match[0].length));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1] || "application/octet-stream" });
}

async function updatePageNotice() {
  const tab = await getActiveIismTab();
  fillButton.disabled = !profileReady;
  if (profileLoadError) {
    pageNotice.textContent = "Could not load saved data. You can still try filling with the details currently entered here.";
    pageNotice.dataset.state = "error";
  } else if (tab) {
    pageNotice.textContent = "IISM admission form detected. Saved blank fields will not overwrite page values.";
    pageNotice.dataset.state = "success";
  } else {
    pageNotice.textContent = "Open admission.iismgulmarg.in/admission_form.aspx to use autofill.";
    pageNotice.dataset.state = "error";
  }
}

function updateOptionalControls() {
  if (!syncAvailable()) {
    syncToggle.disabled = true;
    syncOption.dataset.unavailable = "true";
    syncOption.title = "Chrome sync is not available in this browser profile.";
  }
  let shareSupported = false;
  try {
    const probe = new File(["{}"], "backup.json", { type: "application/json" });
    shareSupported = typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
  } catch {
    shareSupported = false;
  }
  shareButton.hidden = !shareSupported;
}

renderFields();
updateOptionalControls();
loadSavedData();
updatePageNotice();
fillButton.addEventListener("click", fillOpenForm);
clearButton.addEventListener("click", removeAllSavedData);
exportButton.addEventListener("click", exportBackup);
shareButton.addEventListener("click", shareBackup);
syncToggle.addEventListener("change", () => setSyncEnabled(syncToggle.checked));
importButton.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (file) await importBackup(file);
  importFileInput.value = "";
});
