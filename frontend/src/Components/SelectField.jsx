import React, { forwardRef } from "react";

const baseSelectClass =
  "mt-2 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 normal-case";

const normalizeOption = (option) => {
  if (option && typeof option === "object") {
    return {
      label: option.label ?? option.name ?? String(option.value ?? ""),
      value: option.value ?? option.id ?? "",
      disabled: Boolean(option.disabled),
    };
  }

  return {
    label: String(option),
    value: option,
    disabled: false,
  };
};

const SelectField = forwardRef(function SelectField(
  {
    label,
    error,
    hint,
    containerClassName = "",
    labelClassName = "",
    selectClassName = "",
    required = false,
    id,
    options = [],
    placeholder,
    children,
    ...props
  },
  ref,
) {
  const selectId = id || props.name;

  return (
    <div className={containerClassName}>
      {label ? (
        <label
          htmlFor={selectId}
          className={`block text-sm font-medium text-slate-700 ${labelClassName}`}
        >
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </label>
      ) : null}

      <select
        ref={ref}
        id={selectId}
        className={`${baseSelectClass} ${selectClassName}`}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {children
          ? children
          : options.map((option) => {
              const normalized = normalizeOption(option);
              return (
                <option
                  key={`${normalized.value}-${normalized.label}`}
                  value={normalized.value}
                  disabled={normalized.disabled}
                >
                  {normalized.label}
                </option>
              );
            })}
      </select>

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

export default SelectField;
