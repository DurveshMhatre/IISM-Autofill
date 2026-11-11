const PROFILE_KEY = "iismProfile";
const DB_NAME = "iism-form-assistant";
const DB_VERSION = 1;
const STORE_NAME = "documents";
const MAX_FILE_BYTES = 500 * 1024;
const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf"
};

// Any file type is accepted. The file name is used only to give a file a
// useful MIME type when the browser does not report one for it.
function resolveFileType(name, type) {
  const mime = String(type || "").trim().toLowerCase();
  if (mime && mime !== "application/octet-stream") return mime;
  const extension = (/\.([a-z0-9]+)$/i.exec(String(name || "")) || [])[1];
  return MIME_BY_EXTENSION[String(extension || "").toLowerCase()] || "application/octet-stream";
}

const sections = [
  {
    title: "Course details",
    fields: [
      ["courseName", "Course"],
      ["courseLevel", "Course level"],
      ["scheduleCourse", "Course schedule"],
      ["state", "State"]
    ],
    help: "Enter the exact visible option text. Course choices come from the live IISM page."
  },
  {
    title: "Basic details",
    fields: [
      ["name", "Applicant name"],
      ["fatherName", "Father's name"],
      ["nationality", "Nationality"],
      ["dateOfBirth", "Date of birth", "Choose a date.", "date"],
      ["birthCertificate", "Date-of-birth proof", "Any file type, maximum 500 KB", "file"],
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
      ["educationProof", "Education proof", "Any file type, maximum 500 KB", "file"],
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
      ["applicantPhoto", "Applicant photo", "Any file type, maximum 500 KB", "file"],
      ["applicantSignature", "Applicant signature", "Any file type, maximum 500 KB", "file"]
    ]
  },
  {
    title: "Indemnity bond",
    fields: [
      ["emergencyContactName", "Emergency contact name"],
      ["emergencyContactPhone", "Emergency contact phone"],
      ["parentGuardianSignature", "Parent / guardian signature", "For applicants under 18; any file type, maximum 500 KB", "file"]
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
const inputs = new Map();
const validationMessages = new Map();
const fileSaveTasks = new Map();
let saveTimer;
let databasePromise;
let profileReady = false;
let profileLoadError = false;

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
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select";
        input.append(placeholder);
        for (const choice of choices) {
          const option = document.createElement("option");
          option.value = choice;
          option.textContent = choice;
          input.append(option);
        }
        input.addEventListener("change", scheduleSave);
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
    await chrome.storage.local.set({ [PROFILE_KEY]: readProfileFromForm() });
  } catch {
    pageNotice.textContent = "Could not save profile. Check available browser storage.";
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

  if (file.size > MAX_FILE_BYTES) {
    input.value = "";
    try {
      await documentTransaction("readwrite", (store) => store.delete(key));
      state.textContent = `This file is ${Math.ceil(file.size / 1024)} KB. Files must be 500 KB or smaller.`;
      state.dataset.state = "error";
      state.nextElementSibling.hidden = true;
    } catch {
      state.textContent = "Invalid file. Could not remove the previously saved file; remove it manually.";
      state.dataset.state = "error";
    }
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
    const result = await chrome.storage.local.get(PROFILE_KEY);
    const profile = result[PROFILE_KEY] || {};
    for (const [key, input] of inputs) {
      if (input.type === "file") continue;
      input.value = key === "dateOfBirth"
        ? toDatePickerValue(profile[key] || "")
        : profile[key] || "";
      updateFieldValidation(key, input);
    }

    for (const [key, input] of inputs) {
      if (input.type !== "file") continue;
      const saved = await documentTransaction("readonly", (store) => store.get(key));
      if (saved) {
        const state = document.querySelector(`#file-state-${key}`);
        state.textContent = `Saved locally: ${saved.name}`;
        state.dataset.state = "success";
        state.nextElementSibling.hidden = false;
      }
    }
  } catch {
    profileLoadError = true;
    pageNotice.textContent = "Local profile storage is unavailable in this browser.";
    pageNotice.dataset.state = "error";
  } finally {
    profileReady = true;
    await updatePageNotice();
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
  const list = document.createElement("ul");
  for (const item of results) {
    const line = document.createElement("li");
    line.textContent = item;
    list.append(line);
  }
  fillStatus.append(list);
  fillStatus.dataset.state = results.some((item) => item.startsWith("Could not")) ? "error" : "success";
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
    for (const [key, input] of inputs) {
      if (input.type !== "file") continue;
      const saved = await documentTransaction("readonly", (store) => store.get(key));
      if (!saved) continue;
      try {
        const dataUrl = await blobToDataUrl(saved.blob);
        const fileReply = await sendToPage(tab.id, {
          type: "iism-attach-file",
          key,
          file: {
            name: saved.name,
            type: saved.type,
            dataUrl
          }
        });
        if (!fileReply?.ok) throw new Error(fileReply?.error || "Page rejected the file.");
        results.push(`Attached ${saved.name}. Check that it appears in the IISM form.`);
      } catch (error) {
        results.push(`Could not attach ${saved.name}: ${error.message}`);
      }
    }
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

async function removeAllSavedData() {
  if (!window.confirm("Clear all saved profile details and documents from this browser?")) return;
  try {
    clearTimeout(saveTimer);
    await Promise.all(fileSaveTasks.values());
    await chrome.storage.local.remove(PROFILE_KEY);
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

renderFields();
loadSavedData();
updatePageNotice();
fillButton.addEventListener("click", fillOpenForm);
clearButton.addEventListener("click", removeAllSavedData);
