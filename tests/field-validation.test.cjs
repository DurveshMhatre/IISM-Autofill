const assert = require("node:assert/strict");
const test = require("node:test");
const { isValid, rules } = require("../field-validation.js");

test("allows blank optional profile values", () => {
  for (const key of rules.keys()) assert.equal(isValid(key, ""), true, key);
});

test("HTML pattern attributes compile with Unicode-set syntax", () => {
  for (const [key, rule] of rules) {
    assert.doesNotThrow(() => new RegExp(rule.pattern, "v"), key);
  }
});

test("accepts valid names and contact details", () => {
  assert.equal(isValid("name", "Asha Sharma"), true);
  assert.equal(isValid("fatherName", "राज कुमार"), true);
  assert.equal(isValid("nationality", "Indian"), true);
  assert.equal(isValid("mobileNo", "9876543210"), true);
  assert.equal(isValid("emergencyContactPhone", "9123456780"), true);
  assert.equal(isValid("pincode", "190001"), true);
  assert.equal(isValid("emailId", "applicant@example.com"), true);
});

test("rejects malformed names and contact details", () => {
  assert.equal(isValid("name", "Asha123"), false);
  assert.equal(isValid("mobileNo", "987654321"), false);
  assert.equal(isValid("emergencyContactPhone", "12345678901"), false);
  assert.equal(isValid("pincode", "19000A"), false);
  assert.equal(isValid("emailId", "not-an-email"), false);
});

test("validates blood groups and numeric measurements", () => {
  assert.equal(isValid("bloodGroup", "AB+"), true);
  assert.equal(isValid("bloodGroup", "X+"), false);
  assert.equal(isValid("height", "172.5"), true);
  assert.equal(isValid("weight", "70kg"), false);
  assert.equal(isValid("shoeSize", "9.5"), true);
});
