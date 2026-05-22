import React, { forwardRef, useId } from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ").trim();

const uppercaseExceptions = new Set([
  "email",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "file",
]);

const Inputfield = forwardRef(function Inputfield(
  {
    label,
    error,
    helperText,
    wrapperClassName = "",
    labelClassName = "",
    errorClassName = "",
    className = "",
    inputClassName = "",
    type = "text",
    uppercase,
    ...props
  },
  ref,
) {
  const inputId = useId();
  const shouldUppercase =
    typeof uppercase === "boolean"
      ? uppercase
      : !uppercaseExceptions.has(type);

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label
          htmlFor={inputId}
          className={joinClasses(
            "mb-2 block text-sm font-medium text-slate-700",
            labelClassName,
          )}
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={joinClasses(
          "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          shouldUppercase && type !== "file" ? "uppercase" : "normal-case",
          type === "number" ? "appearance-none" : "",
          className,
          inputClassName,
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          error || helperText ? `${inputId}-helptext` : undefined
        }
        {...props}
      />
      {error ? (
        <p
          id={`${inputId}-helptext`}
          className={joinClasses("mt-1 text-sm text-red-500", errorClassName)}
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${inputId}-helptext`}
          className={joinClasses("mt-1 text-sm text-slate-500", errorClassName)}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Inputfield;
