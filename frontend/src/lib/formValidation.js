const HTML_INJECTION_PATTERNS = [
  /<\s*\/?\s*script\b/i,
  /<\s*\/?\s*style\b/i,
  /<\s*\/?\s*iframe\b/i,
  /<\s*\/?\s*svg\b/i,
  /javascript:/i,
  /data:text\/html/i,
  /on\w+\s*=/i,
];

const SQL_INJECTION_PATTERNS = [
  /\bunion\s+select\b/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\binsert\s+into\b/i,
  /\bupdate\b[\s\S]+\bset\b/i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\s+table\b/i,
  /\balter\s+table\b/i,
  /\bexec(?:ute)?\s*\(/i,
  /--/,
  /\/\*/,
  /\*\//,
];

export const normalizeWhitespace = (value = "") =>
  String(value).replace(/\s+/g, " ").trim();

export const hasUnsafeInput = (value = "") => {
  const text = String(value);
  if (!text) return false;

  if (/[<>]/.test(text)) return true;

  return (
    HTML_INJECTION_PATTERNS.some((pattern) => pattern.test(text)) ||
    SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(text))
  );
};

const buildResult = (ok, message = "", value = undefined) => ({
  ok,
  message,
  value,
});

export const validateTextInput = (
  value,
  label,
  {
    required = true,
    minLength = 1,
    maxLength = 255,
    allowEmpty = false,
  } = {},
) => {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    if (required && !allowEmpty) {
      return buildResult(false, `${label} is required`);
    }
    return buildResult(true, "", "");
  }

  if (hasUnsafeInput(normalized)) {
    return buildResult(false, `${label} contains unsupported characters`);
  }

  if (normalized.length < minLength) {
    return buildResult(
      false,
      `${label} must be at least ${minLength} characters`,
    );
  }

  if (normalized.length > maxLength) {
    return buildResult(
      false,
      `${label} must be at most ${maxLength} characters`,
    );
  }

  return buildResult(true, "", normalized);
};

export const validateEmailInput = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) {
    return buildResult(false, "Email is required");
  }

  if (hasUnsafeInput(normalized)) {
    return buildResult(false, "Email contains unsupported characters");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    return buildResult(false, "Invalid email");
  }

  if (normalized.length > 254) {
    return buildResult(false, "Email must be at most 254 characters");
  }

  return buildResult(true, "", normalized);
};

export const validatePasswordInput = (
  value,
  { minLength = 6, maxLength = 128 } = {},
) => {
  const password = String(value ?? "");

  if (!password) {
    return buildResult(false, "Password is required");
  }

  if (hasUnsafeInput(password)) {
    return buildResult(false, "Password contains unsupported characters");
  }

  if (password.length < minLength) {
    return buildResult(
      false,
      `Password must be at least ${minLength} characters`,
    );
  }

  if (password.length > maxLength) {
    return buildResult(
      false,
      `Password must be at most ${maxLength} characters`,
    );
  }

  return buildResult(true, "", password);
};

export const validatePhoneInput = (value, { required = true } = {}) => {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    if (required) return buildResult(false, "Phone is required");
    return buildResult(true, "", "");
  }

  if (hasUnsafeInput(normalized)) {
    return buildResult(false, "Phone contains unsupported characters");
  }

  if (!/^[0-9+()\-\s]+$/.test(normalized)) {
    return buildResult(false, "Phone can contain only digits and + - ( )");
  }

  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < 7) {
    return buildResult(false, "Phone number looks too short");
  }

  return buildResult(true, "", normalized);
};

export const validateNumberInput = (
  value,
  label,
  { min = null, max = null, allowZero = true, integer = false } = {},
) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return buildResult(false, `${label} is required`);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return buildResult(false, `${label} must be a valid number`);
  }

  if (integer && !Number.isInteger(parsed)) {
    return buildResult(false, `${label} must be a whole number`);
  }

  if (!allowZero && parsed <= 0) {
    return buildResult(false, `${label} must be greater than 0`);
  }

  if (min !== null && parsed < min) {
    return buildResult(false, `${label} must be at least ${min}`);
  }

  if (max !== null && parsed > max) {
    return buildResult(false, `${label} must be at most ${max}`);
  }

  return buildResult(true, "", parsed);
};

export const validateDateInput = (value, label) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return buildResult(false, `${label} is required`);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return buildResult(false, `${label} must be a valid date`);
  }

  return buildResult(true, "", normalized);
};

