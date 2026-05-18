import React, { forwardRef } from "react";

const baseTextareaClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 normal-case";

const TextareaField = forwardRef(function TextareaField(
  {
    label,
    error,
    hint,
    containerClassName = "",
    labelClassName = "",
    textareaClassName = "",
    required = false,
    id,
    rows = 3,
    ...props
  },
  ref,
) {
  const textareaId = id || props.name;

  return (
    <div className={containerClassName}>
      {label ? (
        <label
          htmlFor={textareaId}
          className={`block text-sm font-medium text-slate-700 ${labelClassName}`}
        >
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`${baseTextareaClass} ${textareaClassName}`}
        {...props}
      />

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

export default TextareaField;
