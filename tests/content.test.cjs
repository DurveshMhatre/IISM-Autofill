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

function makeHarness({ rejectFiles = false } = {}) {
  const elements = new Map();
  const inputIds = [
    "txtName", "txtFatherName", "txtNationality", "txtDateOfBirth",
    "txtDomicile", "txtHouseNoApartment", "txtStreetVillageColony",
    "txtDistrictCity", "txtPincode", "txtMobileNo", "txtEmailId",
    "txtBloodGroup", "txtMedicalCategory", "txtHeight", "txtWeight",
    "txtWaist", "txtShoeSize", "txtEmergencyContactName",
    "txtEmergencyContactPhone", "FupPhototOfApplicant", "FupEducationQualification", "chkIAgree"
  ];
  for (const id of inputIds) {
    const isFile = id.startsWith("Fup");
    const input = new FakeInput(id, isFile ? "file" : "text");
    if (isFile && rejectFiles) {
      Object.defineProperty(input, "files", { get: () => [], set: () => {} });
    }
    elements.set(id, input);
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
  class FakeFile {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options.type;
      this.size = parts.reduce((total, part) => total + part.length, 0);
    }
  }
  class FakeDataTransfer {
    constructor() {
      const files = [];
      this.items = { add: (file) => files.push(file) };
      Object.defineProperty(this, "files", { get: () => files });
    }
  }

  vm.runInNewContext(contentSource, {
    atob: (text) => Buffer.from(text, "base64").toString("binary"),
    chrome: { runtime: { onMessage: { addListener: (callback) => { listener = callback; } } } },
    DataTransfer: FakeDataTransfer,
    document: { getElementById: (id) => elements.get(id) || null },
    Event: FakeEvent,
    File: FakeFile,
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

test("attaches a user-provided image to its mapped file input", async () => {
  const { elements, send } = makeHarness();
  const dataUrl = `data:image/jpeg;base64,${Buffer.from("test image").toString("base64")}`;
  const reply = await send({
    type: "iism-attach-file",
    key: "applicantPhoto",
    file: { name: "portrait.jpg", type: "image/jpeg", dataUrl }
  });

  assert.equal(reply.ok, true);
  const input = elements.get("FupPhototOfApplicant");
  assert.equal(input.files[0].name, "portrait.jpg");
  assert.deepEqual(input.events, ["input", "change"]);
});

test("rejects images above the documented size limit", async () => {
  const { elements, send } = makeHarness();
  const dataUrl = `data:image/png;base64,${Buffer.alloc(500 * 1024 + 1).toString("base64")}`;
  const reply = await send({
    type: "iism-attach-file",
    key: "applicantPhoto",
    file: { name: "too-large.png", type: "image/png", dataUrl }
  });

  assert.equal(reply.ok, false);
  assert.match(reply.error, /exceeds 500 KB/);
  assert.equal(elements.get("FupPhototOfApplicant").files.length, 0);
});

test("attaches a JPG that the browser reported without a MIME type", async () => {
  const { elements, send } = makeHarness();
  const dataUrl = `data:application/octet-stream;base64,${Buffer.from("test image").toString("base64")}`;
  const reply = await send({
    type: "iism-attach-file",
    key: "applicantPhoto",
    file: { name: "portrait.JPG", type: "", dataUrl }
  });

  assert.equal(reply.ok, true);
  assert.equal(elements.get("FupPhototOfApplicant").files[0].type, "image/jpeg");
  assert.equal(elements.get("FupPhototOfApplicant").files[0].name, "portrait.JPG");
});

test("attaches a PDF to a mapped upload field", async () => {
  const { elements, send } = makeHarness();
  const dataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4 test").toString("base64")}`;
  const reply = await send({
    type: "iism-attach-file",
    key: "educationProof",
    file: { name: "marksheet.pdf", type: "application/pdf", dataUrl }
  });

  assert.equal(reply.ok, true);
  assert.match(reply.result, /marksheet\.pdf/);
});

test("reports a failure when the page does not keep the attached file", async () => {
  const { send } = makeHarness({ rejectFiles: true });
  const dataUrl = `data:image/jpeg;base64,${Buffer.from("test image").toString("base64")}`;
  const reply = await send({
    type: "iism-attach-file",
    key: "applicantPhoto",
    file: { name: "portrait.jpg", type: "image/jpeg", dataUrl }
  });

  assert.equal(reply.ok, false);
  assert.match(reply.error, /Attach it manually/);
});
