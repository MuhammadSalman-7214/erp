import React, { forwardRef, useId } from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ").trim();

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    wrapperClassName = "",
    labelClassName = "",
    errorClassName = "",
    className = "",
    textareaClassName = "",
    uppercase = true,
    rows = 4,
    ...props
  },
  ref,
) {
  const textareaId = useId();

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label
          htmlFor={textareaId}
          className={joinClasses(
            "mb-2 block text-sm font-medium text-slate-700",
            labelClassName,
          )}
        >
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={joinClasses(
          "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          uppercase ? "uppercase" : "normal-case",
          className,
          textareaClassName,
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          error || helperText ? `${textareaId}-helptext` : undefined
        }
        {...props}
      />
      {error ? (
        <p
          id={`${textareaId}-helptext`}
          className={joinClasses("mt-1 text-sm text-red-500", errorClassName)}
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${textareaId}-helptext`}
          className={joinClasses("mt-1 text-sm text-slate-500", errorClassName)}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Textarea;
