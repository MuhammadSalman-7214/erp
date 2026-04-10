const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const shouldPreserveString = (key, value) => {
  if (typeof value !== "string") return false;

  const lowerKey = String(key || "").toLowerCase();
  if (
    lowerKey.includes("image") ||
    lowerKey.includes("photo") ||
    lowerKey.includes("avatar") ||
    lowerKey.includes("profilepic") ||
    lowerKey.includes("logo") ||
    lowerKey.includes("file") ||
    lowerKey.includes("base64")
  ) {
    return true;
  }

  if (value.startsWith("data:") || value.startsWith("http")) {
    return true;
  }

  return false;
};

const uppercaseValue = (value, key, options = {}) => {
  const excludeKeys = new Set(
    (options.excludeKeys || []).map((item) => String(item).toLowerCase()),
  );

  if (excludeKeys.has(String(key || "").toLowerCase())) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => uppercaseValue(item, undefined, options));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        uppercaseValue(entryValue, entryKey, options),
      ]),
    );
  }

  if (typeof value === "string" && !shouldPreserveString(key, value)) {
    return value.toUpperCase();
  }

  return value;
};

export const uppercasePayload = (payload, options = {}) =>
  uppercaseValue(payload, undefined, options);
