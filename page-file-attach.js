function attachFilesToForm(files) {
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

  function attachOneFile({ key, dataUrl, fileName, fileType, maxFileBytes } = {}) {
    const inputId = inputIds[key];
    if (!inputId) return { key, ok: false, error: "This file field is not supported." };

    if (imageOnlyKeys.has(key)) {
      const extension = (/\.([a-z0-9]+)$/i.exec(String(fileName || "")) || [])[1]?.toLowerCase();
      const mime = String(fileType || "").toLowerCase();
      const normalizedType = imageMimeAliases[mime] || mime;
      if (!["jpg", "jpeg", "png"].includes(extension) ||
          !["image/jpeg", "image/png"].includes(normalizedType)) {
        return {
          key,
          ok: false,
          error: "IISM requires a JPG/JPEG/PNG image here (maximum 500 KB). PDF files are not accepted."
        };
      }
    }

    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement) || input.type !== "file") {
      return { key, ok: false, error: "The matching upload field was not found on the page." };
    }

    const match = /^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
    if (!match) return { key, ok: false, error: "The saved file could not be read. Choose it again." };

    try {
      const binary = atob(match[1]);
      if (binary.length > maxFileBytes) {
        return { key, ok: false, error: "The selected file exceeds 500 KB." };
      }

      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const name = fileName || "upload";
      const file = new File([bytes], name, {
        type: fileType || "application/octet-stream"
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);

      const filesSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files")?.set;
      if (!filesSetter) return { key, ok: false, error: "This browser cannot set the form's file input." };
      filesSetter.call(input, transfer.files);

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      return { key, ok: true, inputId, name, size: file.size };
    } catch (error) {
      return { key, ok: false, error: (error && error.message) || "Could not attach this file." };
    }
  }

  return (Array.isArray(files) ? files : []).map(attachOneFile);
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

function isFormBusy() {
  try {
    const manager = globalThis.Sys && globalThis.Sys.WebForms && globalThis.Sys.WebForms.PageRequestManager
      ? globalThis.Sys.WebForms.PageRequestManager.getInstance()
      : null;
    if (manager && typeof manager.get_isInAsyncPostBack === "function" && manager.get_isInAsyncPostBack()) {
      return true;
    }
  } catch (error) {
    // The page may not expose ASP.NET AJAX state; fall back to the document state.
  }
  return document.readyState !== "complete";
}

globalThis.IISMPageFileAttachment = { attachFilesToForm, verifyFilesOnForm, isFormBusy };

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.IISMPageFileAttachment;
}
