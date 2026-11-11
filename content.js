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

  const SELECT_FIELDS = [
    ["courseName", "ddlCourse", "Course"],
    ["courseLevel", "ddlCourseLevel", "Course level"],
    ["scheduleCourse", "ddlScheduleCourse", "Course schedule"],
    ["state", "ddlState", "State"],
    ["educationQualification", "ddlEduationQualification", "Education qualification"],
    ["vegetarianOrNon", "ddlVegetarianOrNon", "Vegetarian / non-vegetarian"]
  ];
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

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (location.origin !== "https://admission.iismgulmarg.in" ||
        location.pathname.toLowerCase() !== "/admission_form.aspx") return false;

    if (message?.type === "iism-fill-profile") {
      fillProfile(message.profile || {})
        .then((results) => sendResponse({ ok: true, results }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    return false;
  });
})();
