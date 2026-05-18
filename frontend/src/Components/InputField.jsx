import React, { forwardRef } from "react";

const baseInputClass =
  "mt-2 w-full rounded-lg border-b border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 normal-case";

const InputField = forwardRef(function InputField(
  {
    label,
    error,
    hint,
    containerClassName = "",
    labelClassName = "",
    inputClassName = "",
    wrapperClassName = "",
    suffix,
    prefix,
    required = false,
    id,
    type = "text",
    ...props
  },
  ref,
) {
  const inputId = id || props.name;
  const hasAdornment = Boolean(prefix || suffix);

  return (
    <div className={containerClassName}>
      {label ? (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-slate-700 ${labelClassName}`}
        >
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </label>
      ) : null}

      <div className={`relative ${wrapperClassName}`}>
        {prefix ? (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {prefix}
          </div>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`${baseInputClass} ${hasAdornment ? "px-10" : ""} ${prefix ? "pl-10" : ""} ${suffix ? "pr-12" : ""} ${inputClassName}`}
          {...props}
        />

        {suffix ? (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {suffix}
          </div>
        ) : null}
      </div>

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

export default InputField;
