const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const contentSource = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

class FakeEvent {
  constructor(type) {
    this.type = type;
  }
}

class FakeInput {
  constructor(id, type = "text") {
    this.id = id;
    this.type = type;
    this.events = [];
    this.files = [];
    this._value = "";
    this.checked = false;
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
  }

  dispatchEvent(event) {
    this.events.push(event.type);
    return true;
  }
}

class FakeSelect {
  constructor(id, options) {
    this.id = id;
    this.options = options;
    this.events = [];
    this.value = "";
  }

  dispatchEvent(event) {
    this.events.push(event.type);
    return true;
  }
}

function makeHarness() {
  const elements = new Map();
  const inputIds = [
    "txtName", "txtFatherName", "txtNationality", "txtDateOfBirth",
    "txtDomicile", "txtHouseNoApartment", "txtStreetVillageColony",
    "txtDistrictCity", "txtPincode", "txtMobileNo", "txtEmailId",
    "txtBloodGroup", "txtMedicalCategory", "txtHeight", "txtWeight",
    "txtWaist", "txtShoeSize", "txtEmergencyContactName",
    "txtEmergencyContactPhone", "chkIAgree"
  ];
  for (const id of inputIds) {
    elements.set(id, new FakeInput(id));
  }

  const options = (names) => [
    { value: "0", textContent: "Select" },
    ...names.map((name, index) => ({ value: String(index + 1), textContent: name }))
  ];
  for (const [id, names] of [
    ["ddlCourse", ["Ski Course"]],
    ["ddlCourseLevel", ["Basic"]],
    ["ddlScheduleCourse", ["Batch A"]],
    ["ddlState", ["Jammu and Kashmir"]],
    ["ddlEduationQualification", ["Intermediate"]],
    ["ddlVegetarianOrNon", ["Vegetarian"]]
  ]) {
    elements.set(id, new FakeSelect(id, options(names)));
  }

  let listener;
  vm.runInNewContext(contentSource, {
    chrome: { runtime: { onMessage: { addListener: (callback) => { listener = callback; } } } },
    document: { getElementById: (id) => elements.get(id) || null },
    Event: FakeEvent,
    HTMLInputElement: FakeInput,
    HTMLSelectElement: FakeSelect,
    location: {
      origin: "https://admission.iismgulmarg.in",
      pathname: "/admission_form.aspx"
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    }
  });

  const send = (message) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("content script did not reply")), 1000);
    listener(message, {}, (reply) => {
      clearTimeout(timer);
      resolve(reply);
    });
  });
  return { elements, send };
}

test("fills mapped fields and leaves consent unchanged", async () => {
  const { elements, send } = makeHarness();
  const reply = await send({
    type: "iism-fill-profile",
    profile: {
      name: "Test Applicant",
      fatherName: "Test Parent",
      dateOfBirth: "2000-01-01",
      mobileNo: "9000000000",
      emailId: "applicant@example.test",
      courseName: "Ski Course",
      courseLevel: "Basic",
      scheduleCourse: "Batch A",
      state: "Jammu and Kashmir",
      educationQualification: "Intermediate",
      vegetarianOrNon: "Vegetarian"
    }
  });

  assert.equal(reply.ok, true);
  assert.equal(elements.get("txtName").value, "Test Applicant");
  assert.equal(elements.get("txtDateOfBirth").value, "01/01/2000");
  assert.equal(elements.get("ddlCourse").value, "1");
  assert.equal(elements.get("ddlScheduleCourse").value, "1");
  assert.equal(elements.get("chkIAgree").checked, false);
  assert.ok(reply.results.some((result) => result.includes("Declaration was left unchanged")));
});
