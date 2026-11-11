(() => {
  const TEXT_FIELDS = {
    name: "txtName",
    fatherName: "txtFatherName",
    nationality: "txtNationality",
    dateOfBirth: "txtDateOfBirth",
    domicile: "txtDomicile",
    houseNoApartment: "txtHouseNoApartment",
    streetVillageColony: "txtStreetVillageColony",
    districtCity: "txtDistrictCity",
    pincode: "txtPincode",
    mobileNo: "txtMobileNo",
    emailId: "txtEmailId",
    bloodGroup: "txtBloodGroup",
    medicalCategory: "txtMedicalCategory",
    height: "txtHeight",
    weight: "txtWeight",
    waist: "txtWaist",
    shoeSize: "txtShoeSize",
    emergencyContactName: "txtEmergencyContactName",
    emergencyContactPhone: "txtEmergencyContactPhone"
  };

  const FILE_FIELDS = {
    birthCertificate: "FupBirthCertificate",
    domicileProof: "FupDomicileAttachProof",
    educationProof: "FupEducationQualification",
    skiCertificate: "FupAnyAdventureCoursePhoto",
    currentEmployment: "FupCurrentEmployment",
    applicantPhoto: "FupPhototOfApplicant",
    applicantSignature: "FupSignatureOfAppicant",
    parentGuardianSignature: "FupParentGuardianSignature"
  };

  const SELECT_FIELDS = [
    ["courseName", "ddlCourse", "Course"],
    ["courseLevel", "ddlCourseLevel", "Course level"],
    ["scheduleCourse", "ddlScheduleCourse", "Course schedule"],
    ["state", "ddlState", "State"],
    ["educationQualification", "ddlEduationQualification", "Education qualification"],
    ["vegetarianOrNon", "ddlVegetarianOrNon", "Vegetarian / non-vegetarian"]
  ];
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

  function normalize(text) {
    return (text || "")
      .normalize("NFKC")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase();
  }

  function setTextField(id, value, label, results) {
    if (!value) return;
    const field = document.getElementById(id);
    if (!(field instanceof HTMLInputElement)) {
      results.push(`Could not find ${label} on this version of the form.`);
      return;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    results.push(`Filled ${label}.`);
  }

  function findOption(id, desiredText) {
    const select = document.getElementById(id);
    if (!(select instanceof HTMLSelectElement)) return null;
    const wanted = normalize(desiredText);
    return [...select.options].find((option) =>
      option.value !== "0" && normalize(option.textContent) === wanted
    ) || null;
  }

  function waitForOption(id, desiredText, timeoutMs = 10000) {
    if (findOption(id, desiredText)) return Promise.resolve(true);
    return new Promise((resolve) => {
      let done = false;
      const finish = (found) => {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(timeout);
        resolve(found);
      };
      const observer = new MutationObserver(() => {
        if (findOption(id, desiredText)) finish(true);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      const timeout = setTimeout(() => finish(false), timeoutMs);
      if (findOption(id, desiredText)) finish(true);
    });
  }

  async function setSelect(key, id, label, value, results, wait = false) {
    if (!value) return true;
    if (wait && !(await waitForOption(id, value))) {
      results.push(`Could not match ${label}: "${value}" is not in the live options.`);
      return false;
    }
    const select = document.getElementById(id);
    const option = findOption(id, value);
    if (!(select instanceof HTMLSelectElement) || !option) {
      results.push(`Could not match ${label}: "${value}" is not in the live options.`);
      return false;
    }
    select.value = option.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    results.push(`Selected ${label}.`);
    return true;
  }

  async function fillSelects(profile, results) {
    const courseFields = SELECT_FIELDS.slice(0, 3);
    let cascadeAvailable = true;
    for (let index = 0; index < courseFields.length; index += 1) {
      const [key, id, label] = courseFields[index];
      const hasValue = Boolean(profile[key]?.trim());
      if (!hasValue) continue;
      if (index > 0 && !cascadeAvailable) {
        results.push(`Skipped ${label}; choose the preceding course option first.`);
        continue;
      }
      const selected = await setSelect(key, id, label, profile[key], results, index > 0);
      if (!selected) cascadeAvailable = false;
    }

    for (const [key, id, label] of SELECT_FIELDS.slice(3)) {
      await setSelect(key, id, label, profile[key], results);
    }
  }

  async function fillProfile(profile) {
    const results = [];
    for (const [key, id] of Object.entries(TEXT_FIELDS)) {
      const value = typeof profile[key] === "string" ? profile[key].trim() : "";
      const formValue = key === "dateOfBirth" ? formatDateForIism(value) : value;
      setTextField(id, formValue, keyToLabel(key), results);
    }
    await fillSelects(profile, results);
    results.push("Declaration was left unchanged. Review the form and submit it yourself.");
    return results;
  }

  function keyToLabel(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  function formatDateForIism(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function decodeFileBytes(dataUrl) {
    const match = /^data:([^,]*);base64,([\s\S]+)$/.exec(String(dataUrl || "").trim());
    if (!match || !/^[A-Za-z0-9+/=]+$/.test(match[2].trim())) {
      throw new Error("The saved file could not be read. Choose this document again.");
    }
    const binary = atob(match[2].trim());
    if (binary.length > MAX_FILE_BYTES) throw new Error("The selected file exceeds 500 KB.");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function attachFile(key, metadata) {
    const id = FILE_FIELDS[key];
    if (!id) throw new Error("This file field is not supported.");
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement) || input.type !== "file") {
      throw new Error("The matching upload field was not found on the page.");
    }
    const bytes = decodeFileBytes(metadata.dataUrl);
    const fileName = metadata.name || "upload";
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], fileName, {
      type: resolveFileType(fileName, metadata.type)
    }));
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Confirm the page actually kept the file instead of reporting a false success.
    if (!input.files || input.files.length === 0) {
      throw new Error("The page did not keep this file. Attach it manually on the form.");
    }
    return `Attached ${input.files[0].name || fileName}.`;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (location.origin !== "https://admission.iismgulmarg.in" ||
        location.pathname.toLowerCase() !== "/admission_form.aspx") return false;

    if (message?.type === "iism-fill-profile") {
      fillProfile(message.profile || {})
        .then((results) => sendResponse({ ok: true, results }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === "iism-attach-file") {
      try {
        sendResponse({ ok: true, result: attachFile(message.key, message.file || {}) });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return false;
    }
    return false;
  });
})();
