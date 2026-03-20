/**
 * script.js — Job Application Portal
 * Handles: validation · drag-and-drop upload · fetch submission · UI feedback
 */

"use strict";

/* ── Config ──────────────────────────────────────────────────────────────── */
const API_BASE = "http://localhost:5000/api";

/* ── DOM refs ────────────────────────────────────────────────────────────── */
const form        = document.getElementById("applicationForm");
const submitBtn   = document.getElementById("submitBtn");
const btnLabel    = submitBtn.querySelector(".btn-label");
const btnLoader   = submitBtn.querySelector(".btn-loader");
const toast       = document.getElementById("toast");

// File upload
const dropzone    = document.getElementById("dropzone");
const fileInput   = document.getElementById("resume");
const dzIdle      = document.getElementById("dropzoneIdle");
const dzPreview   = document.getElementById("dropzonePreview");
const previewName = document.getElementById("previewName");
const previewSize = document.getElementById("previewSize");
const removeFile  = document.getElementById("removeFile");

// Char counter
const coverLetter = document.getElementById("coverLetter");
const charCount   = document.getElementById("charCount");


/* ══════════════════════════════════════════════════════════════
   VALIDATION
   ══════════════════════════════════════════════════════════════ */

/** Rules: each returns null (ok) or an error string */
const RULES = {
  fullName(v) {
    if (!v || v.trim().length < 2) return "Full name must be at least 2 characters.";
    if (v.trim().length > 100)     return "Full name cannot exceed 100 characters.";
    return null;
  },
  email(v) {
    if (!v || !v.trim()) return "Email address is required.";
    if (!/^\S+@\S+\.\S+$/.test(v.trim())) return "Enter a valid email address.";
    return null;
  },
  phone(v) {
    if (!v || !v.trim()) return "Phone number is required.";
    if (!/^[\d\s\+\-\(\)]{7,20}$/.test(v.trim())) return "Enter a valid phone number (7–20 digits).";
    return null;
  },
  position(v) {
    if (!v) return "Please select a position.";
    return null;
  },
  yearsOfExperience(v) {
    if (v === "" || v === undefined || v === null) return "Years of experience is required.";
    const n = Number(v);
    if (isNaN(n)) return "Enter a numeric value.";
    if (n < 0)   return "Experience cannot be negative.";
    if (n > 50)  return "That value seems too high (max 50).";
    return null;
  },
  coverLetter(v) {
    if (v && v.length > 5000) return "Cover letter cannot exceed 5 000 characters.";
    return null;
  },
};

/** Mark a field as invalid */
function setError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(`err-${fieldId}`);
  if (input) input.classList.add("is-error");
  if (err)   err.textContent = message || "";
}

/** Clear a single field's error */
function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  const err   = document.getElementById(`err-${fieldId}`);
  if (input) input.classList.remove("is-error");
  if (err)   err.textContent = "";
}

/** Clear every field's error */
function clearAllErrors() {
  document.querySelectorAll(".is-error").forEach(el => el.classList.remove("is-error"));
  document.querySelectorAll(".field-err").forEach(el => (el.textContent = ""));
}

/**
 * Run all validation rules against current form data.
 * Returns true if valid, false otherwise (errors painted to UI).
 */
function validateForm() {
  clearAllErrors();
  let valid = true;

  const data = collectFormData();

  // Text fields
  for (const [field, rule] of Object.entries(RULES)) {
    const msg = rule(data[field] ?? "");
    if (msg) { setError(field, msg); valid = false; }
  }

  // File
  const file = fileInput.files[0];
  if (!file) {
    document.getElementById("err-resume").textContent = "Résumé (PDF) is required.";
    valid = false;
  } else if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    document.getElementById("err-resume").textContent = "Only PDF files are accepted.";
    valid = false;
  } else if (file.size > 5 * 1024 * 1024) {
    document.getElementById("err-resume").textContent = "File size must not exceed 5 MB.";
    valid = false;
  }

  return valid;
}

/** Collect plain-text form data into an object */
function collectFormData() {
  return {
    fullName:         document.getElementById("fullName").value,
    email:            document.getElementById("email").value,
    phone:            document.getElementById("phone").value,
    position:         document.getElementById("position").value,
    yearsOfExperience: document.getElementById("yearsOfExperience").value,
    coverLetter:      document.getElementById("coverLetter").value,
  };
}


/* ══════════════════════════════════════════════════════════════
   FILE UPLOAD — Drag & Drop + Input
   ══════════════════════════════════════════════════════════════ */

function fmtBytes(bytes) {
  if (bytes < 1024)      return bytes + " B";
  if (bytes < 1048576)   return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function showPreview(file) {
  previewName.textContent = file.name;
  previewSize.textContent = fmtBytes(file.size);
  dzIdle.classList.add("hidden");
  dzPreview.classList.remove("hidden");
  dropzone.classList.add("has-file");
  // Prevent the file-input click from triggering when in preview mode
  fileInput.style.pointerEvents = "none";
  document.getElementById("err-resume").textContent = "";
}

function clearPreview() {
  dzIdle.classList.remove("hidden");
  dzPreview.classList.add("hidden");
  dropzone.classList.remove("has-file");
  fileInput.value = "";
  fileInput.style.pointerEvents = "";
}

// Native input change
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) showPreview(fileInput.files[0]);
});

// Remove button
removeFile.addEventListener("click", (e) => {
  e.stopPropagation();
  clearPreview();
});

// Drag events
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (!dropzone.classList.contains("has-file"))
    dropzone.classList.add("drag-over");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  if (dropzone.classList.contains("has-file")) return;

  const file = e.dataTransfer.files[0];
  if (!file) return;

  // Inject into the file input via DataTransfer
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    showPreview(file);
  } catch (_) {
    // DataTransfer not supported in some browsers — show name only
    showPreview(file);
  }
});


/* ══════════════════════════════════════════════════════════════
   CHAR COUNTER
   ══════════════════════════════════════════════════════════════ */
coverLetter.addEventListener("input", () => {
  const len = coverLetter.value.length;
  charCount.textContent = len;
  charCount.style.color = len > 4800 ? "#c0392b" : "";
});


/* ══════════════════════════════════════════════════════════════
   INLINE VALIDATION — clear error on user correction
   ══════════════════════════════════════════════════════════════ */
["fullName", "email", "phone", "position", "yearsOfExperience", "coverLetter"].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input",  () => clearError(id));
  el.addEventListener("change", () => clearError(id));
});


/* ══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ══════════════════════════════════════════════════════════════ */
let toastTimer = null;

function showToast(type, message, duration = 6000) {
  clearTimeout(toastTimer);
  toast.className = `toast show ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : "✕"}</span>
    <span>${message}</span>
  `;
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}


/* ══════════════════════════════════════════════════════════════
   LOADING STATE
   ══════════════════════════════════════════════════════════════ */
function setLoading(on) {
  submitBtn.disabled = on;
  btnLabel.classList.toggle("hidden", on);
  btnLoader.classList.toggle("hidden", !on);
}


/* ══════════════════════════════════════════════════════════════
   FORM SUBMISSION
   ══════════════════════════════════════════════════════════════ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Close any previous toast
  toast.classList.remove("show");

  // Validate
  if (!validateForm()) {
    // Scroll first error into view
    const firstErr = form.querySelector(".is-error, [id^='err-']:not(:empty)");
    if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  setLoading(true);

  try {
    // Build multipart payload
    const fd = new FormData();
    fd.append("fullName",          document.getElementById("fullName").value.trim());
    fd.append("email",             document.getElementById("email").value.trim());
    fd.append("phone",             document.getElementById("phone").value.trim());
    fd.append("position",          document.getElementById("position").value);
    fd.append("yearsOfExperience", document.getElementById("yearsOfExperience").value);
    fd.append("coverLetter",       document.getElementById("coverLetter").value.trim());
    fd.append("resume",            fileInput.files[0]);

    const res  = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      body:   fd,
      // Do NOT set Content-Type; browser sets it with boundary automatically
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showToast("success", data.message || "Application submitted successfully!");
      resetForm();
    } else {
      const msg = data.message || "Submission failed. Please try again.";
      showToast("error", msg);

      // Surface server-side field errors if present
      if (Array.isArray(data.details)) {
        data.details.forEach(detail => console.warn("Server error:", detail));
      }
    }
  } catch (err) {
    console.error("[submit]", err);
    showToast("error", "Network error — please check your connection and try again.");
  } finally {
    setLoading(false);
  }
});


/* ── Reset after successful submission ─── */
function resetForm() {
  form.reset();
  clearAllErrors();
  clearPreview();
  charCount.textContent = "0";
  // Scroll to top of form
  document.getElementById("apply").scrollIntoView({ behavior: "smooth" });
}
