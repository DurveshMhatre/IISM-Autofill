const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const attachSource = fs.readFileSync(path.join(__dirname, "..", "page-file-attach.js"), "utf8");

class FakeEvent {
  constructor(type) {
    this.type = type;
  }
}

class FakeInput {
  constructor({ clearOnChange = false } = {}) {
    this.type = "file";
    this.events = [];
    this._files = [];
    this.clearOnChange = clearOnChange;
  }

  dispatchEvent(event) {
    this.events.push(event.type);
    if (event.type === "change" && this.clearOnChange) this._files = [];
    return true;
  }
}

Object.defineProperty(FakeInput.prototype, "files", {
  get() {
    return this._files;
  },
  set(files) {
    this._files = [...files];
  }
});

class FakeFile {
  constructor(parts, name, options) {
    this.name = name;
    this.type = options.type;
    this.size = parts.reduce((total, part) => total + part.byteLength, 0);
  }
}

class FakeDataTransfer {
  constructor() {
    const files = [];
    this.items = { add: (file) => files.push(file) };
    Object.defineProperty(this, "files", { get: () => files });
  }
}

function makeHarness(options = {}) {
  const inputs = new Map([
    ["FupPhototOfApplicant", new FakeInput(options)],
    ["FupBirthCertificate", new FakeInput(options)],
    ["FupCurrentEmployment", new FakeInput(options)],
    ["FupDomicileAttachProof", new FakeInput(options)]
  ]);
  const sandbox = {
    atob: (text) => Buffer.from(text, "base64").toString("binary"),
    DataTransfer: FakeDataTransfer,
    document: {
      getElementById: (id) => inputs.get(id) || null
    },
    Event: FakeEvent,
    File: FakeFile,
    HTMLInputElement: FakeInput,
    setTimeout
  };
  vm.runInNewContext(attachSource, sandbox);
  return { inputs, api: sandbox.IISMPageFileAttachment };
}

test("attaches a PDF to an unrestricted proof field and verifies the selected input", async () => {
  const { inputs, api } = makeHarness();
  const dataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4 test").toString("base64")}`;
  const result = await api.attachFileToForm(
    "domicileProof",
    dataUrl,
    "applicant.pdf",
    "application/pdf",
    500 * 1024
  );

  assert.equal(result.ok, true);
  const input = inputs.get("FupDomicileAttachProof");
  assert.equal(input.files[0].name, "applicant.pdf");
  assert.deepEqual(input.events, ["input", "change"]);
  assert.equal(api.verifyFilesOnForm([{
    inputId: "FupDomicileAttachProof",
    name: "applicant.pdf",
    size: Buffer.byteLength("%PDF-1.4 test")
  }]).ok, true);
});

test("attaches date-of-birth proof to the correct IISM upload field", async () => {
  const { inputs, api } = makeHarness();
  const dataUrl = `data:image/jpeg;base64,${Buffer.from("birth proof").toString("base64")}`;
  const result = await api.attachFileToForm(
    "birthCertificate",
    dataUrl,
    "birth-certificate.jpg",
    "image/jpeg",
    500 * 1024
  );

  assert.equal(result.ok, true);
  assert.equal(inputs.get("FupBirthCertificate").files[0].name, "birth-certificate.jpg");
  assert.equal(inputs.get("FupPhototOfApplicant").files.length, 0);
});

test("rejects PDF for every IISM image-only upload field", () => {
  const imageOnlyKeys = [
    "birthCertificate",
    "educationProof",
    "applicantPhoto",
    "applicantSignature",
    "parentGuardianSignature"
  ];
  const dataUrl = `data:application/pdf;base64,${Buffer.from("proof").toString("base64")}`;

  for (const key of imageOnlyKeys) {
    const { api } = makeHarness();
    const result = api.attachFileToForm(
      key,
      dataUrl,
      `${key}.pdf`,
      "application/pdf",
      500 * 1024
    );

    assert.equal(result.ok, false, `${key} should reject PDF`);
    assert.match(result.error, /requires a JPG\/JPEG\/PNG image/);
  }
});

test("attaches current-employment proof to its mapped IISM upload field", async () => {
  const { inputs, api } = makeHarness();
  const dataUrl = `data:application/pdf;base64,${Buffer.from("employment proof").toString("base64")}`;
  const result = await api.attachFileToForm(
    "currentEmployment",
    dataUrl,
    "employment-proof.pdf",
    "application/pdf",
    500 * 1024
  );

  assert.equal(result.ok, true);
  assert.equal(inputs.get("FupCurrentEmployment").files[0].name, "employment-proof.pdf");
});

test("reports failure when the page clears the file during its change handler", async () => {
  const { api } = makeHarness({ clearOnChange: true });
  const dataUrl = `data:image/jpeg;base64,${Buffer.from("photo").toString("base64")}`;
  const result = await api.attachFileToForm(
    "applicantPhoto",
    dataUrl,
    "photo.jpg",
    "image/jpeg",
    500 * 1024
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /cleared this file/);
});

test("reports missing files after all form change handlers have run", () => {
  const { api } = makeHarness({ clearOnChange: true });
  const result = api.verifyFilesOnForm([{
    inputId: "FupPhototOfApplicant",
    name: "photo.jpg",
    size: 5
  }]);

  assert.equal(result.ok, false);
  assert.equal(result.missing[0].inputId, "FupPhototOfApplicant");
});
