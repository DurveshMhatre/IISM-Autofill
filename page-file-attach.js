function attachFileToForm(inputKey, dataUrl, fileName, fileType, maxFileBytes) {
  const imageOnlyKeys = new Set([
    "birthCertificate",
    "educationProof",
    "applicantPhoto",
    "applicantSignature",
    "parentGuardianSignature"
  ]);
  const imageMimeAliases = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png"
  };
  const inputIds = {
    birthCertificate: "FupBirthCertificate",
    domicileProof: "FupDomicileAttachProof",
    educationProof: "FupEducationQualification",
    skiCertificate: "FupAnyAdventureCoursePhoto",
    currentEmployment: "FupCurrentEmployment",
    applicantPhoto: "FupPhototOfApplicant",
    applicantSignature: "FupSignatureOfAppicant",
    parentGuardianSignature: "FupParentGuardianSignature"
  };
  const inputId = inputIds[inputKey];
  if (!inputId) return { ok: false, error: "This file field is not supported." };

  if (imageOnlyKeys.has(inputKey)) {
    const extension = (/\.([a-z0-9]+)$/i.exec(String(fileName || "")) || [])[1]?.toLowerCase();
    const mime = String(fileType || "").toLowerCase();
    const normalizedType = imageMimeAliases[mime] || mime;
    if (!["jpg", "jpeg", "png"].includes(extension) ||
        !["image/jpeg", "image/png"].includes(normalizedType)) {
      return {
        ok: false,
        error: "IISM requires a JPG/JPEG/PNG image here (maximum 500 KB). PDF files are not accepted."
      };
    }
  }

  const input = document.getElementById(inputId);
  if (!(input instanceof HTMLInputElement) || input.type !== "file") {
    return { ok: false, error: "The matching upload field was not found on the page." };
  }

  const match = /^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) return { ok: false, error: "The saved file could not be read. Choose it again." };

  try {
    const binary = atob(match[1]);
    if (binary.length > maxFileBytes) {
      return { ok: false, error: "The selected file exceeds 500 KB." };
    }

    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const file = new File([bytes], fileName || "upload", {
      type: fileType || "application/octet-stream"
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);

    const filesSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files")?.set;
    if (!filesSetter) return { ok: false, error: "This browser cannot set the form's file input." };
    filesSetter.call(input, transfer.files);

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    return new Promise((resolve) => {
      setTimeout(() => {
        const selected = input.files?.[0];
        if (!selected || selected.name !== file.name || selected.size !== file.size) {
          resolve({
            ok: false,
            error: "The IISM page cleared this file. Attach it manually and confirm it stays selected."
          });
          return;
        }
        resolve({ ok: true, name: selected.name, size: selected.size });
      }, 100);
    });
  } catch (error) {
    return { ok: false, error: error?.message || "Could not attach this file." };
  }
}

function verifyFilesOnForm(expectedFiles) {
  const missing = [];
  for (const { inputId, name, size } of expectedFiles) {
    const input = document.getElementById(inputId);
    const selected = input instanceof HTMLInputElement ? input.files?.[0] : null;
    if (!selected || selected.name !== name || selected.size !== size) {
      missing.push({ inputId, name });
    }
  }
  return { ok: missing.length === 0, missing };
}

globalThis.IISMPageFileAttachment = { attachFileToForm, verifyFilesOnForm };

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.IISMPageFileAttachment;
}
