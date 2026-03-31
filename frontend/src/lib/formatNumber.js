export const formatFixed = (value, digits = 2) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return (0).toFixed(digits);
  }
  return number.toFixed(digits);
};

export const formatCurrency = (value, currency = "Rs") =>
  `${currency} ${Number(value || 0).toLocaleString()}`;
