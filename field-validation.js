const rules = new Map([
  ["name", {
    pattern: "[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]{0,49}",
    expression: /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,49}$/u,
    message: "Use up to 50 letters, spaces, periods, apostrophes, or hyphens."
  }],
  ["fatherName", {
    pattern: "[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]{0,49}",
    expression: /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,49}$/u,
    message: "Use up to 50 letters, spaces, periods, apostrophes, or hyphens."
  }],
  ["nationality", {
    pattern: "[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]{0,49}",
    expression: /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,49}$/u,
    message: "Use up to 50 letters, spaces, periods, apostrophes, or hyphens."
  }],
  ["emergencyContactName", {
    pattern: "[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]{0,49}",
    expression: /^[\p{L}\p{M}][\p{L}\p{M} .'-]{0,49}$/u,
    message: "Use up to 50 letters, spaces, periods, apostrophes, or hyphens."
  }],
  ["mobileNo", {
    pattern: "[0-9]{10}",
    expression: /^[0-9]{10}$/,
    message: "Enter exactly 10 digits."
  }],
  ["emergencyContactPhone", {
    pattern: "[0-9]{10}",
    expression: /^[0-9]{10}$/,
    message: "Enter exactly 10 digits."
  }],
  ["pincode", {
    pattern: "[0-9]{6}",
    expression: /^[0-9]{6}$/,
    message: "Enter exactly 6 digits."
  }],
  ["bloodGroup", {
    pattern: "(?:A|B|AB|O)[+\\-]",
    expression: /^(?:A|B|AB|O)[+-]$/,
    message: "Use a standard blood group such as A+, O-, or AB+."
  }],
  ["height", {
    pattern: "[0-9]{1,3}(?:\\.[0-9]{1,2})?",
    expression: /^[0-9]{1,3}(?:\.[0-9]{1,2})?$/,
    message: "Enter a number, with up to 2 decimal places."
  }],
  ["weight", {
    pattern: "[0-9]{1,3}(?:\\.[0-9]{1,2})?",
    expression: /^[0-9]{1,3}(?:\.[0-9]{1,2})?$/,
    message: "Enter a number, with up to 2 decimal places."
  }],
  ["waist", {
    pattern: "[0-9]{1,3}(?:\\.[0-9]{1,2})?",
    expression: /^[0-9]{1,3}(?:\.[0-9]{1,2})?$/,
    message: "Enter a number, with up to 2 decimal places."
  }],
  ["shoeSize", {
    pattern: "[0-9]{1,2}(?:\\.[0-9])?",
    expression: /^[0-9]{1,2}(?:\.[0-9])?$/,
    message: "Enter a shoe size number, optionally with one decimal."
  }],
  ["emailId", {
    pattern: "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}",
    expression: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u,
    message: "Enter a valid email address."
  }]
]);

function isValid(key, value) {
  const rule = rules.get(key);
  const text = typeof value === "string" ? value.trim() : "";
  return !rule || text === "" || rule.expression.test(text);
}

const api = { rules, isValid };
globalThis.IISMFieldValidation = api;

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
