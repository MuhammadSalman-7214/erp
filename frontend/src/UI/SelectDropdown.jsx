import React, { forwardRef, useId, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ").trim();

const SelectDropdown = forwardRef(function SelectDropdown(
  {
    label,
    error,
    helperText,
    wrapperClassName = "",
    labelClassName = "",
    errorClassName = "",
    className = "",
    selectClassName = "",
    uppercase = true,
    options,
    children,
    placeholder = "Select an option",
    multiple = false,
    value,
    onChange,
    ...props
  },
  ref,
) {
  const selectId = useId();
  const selectOptions = useMemo(() => options || [], [options]);
  const hasValue =
    value !== undefined && value !== null && String(value).length > 0;
  const resolvedValue = multiple
    ? Array.isArray(value)
      ? value.map((item) => String(item))
      : []
    : value ?? "";

  const handleChange = (event) => {
    if (multiple) {
      const values = Array.from(event.target.selectedOptions).map((option) => {
        const resolvedOption = selectOptions.find(
          (item) => String(item.value) === option.value,
        );
        return resolvedOption ? resolvedOption.value : option.value;
      });
      onChange?.(values, event);
      return;
    }

    const resolvedOption = selectOptions.find(
      (option) => String(option.value) === event.target.value,
    );
    onChange?.(resolvedOption ? resolvedOption.value : event.target.value, event);
  };

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label
          htmlFor={selectId}
          className={joinClasses(
            "mb-2 block text-sm font-medium text-slate-700",
            labelClassName,
          )}
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          value={resolvedValue}
          onChange={handleChange}
          multiple={multiple}
          className={joinClasses(
            "w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            uppercase ? "uppercase" : "normal-case",
            className,
            selectClassName,
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error || helperText ? `${selectId}-helptext` : undefined
          }
          {...props}
        >
          {!multiple ? (
            <option value="" disabled={hasValue || !placeholder}>
              {placeholder}
            </option>
          ) : null}
          {selectOptions.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
      {error ? (
        <p
          id={`${selectId}-helptext`}
          className={joinClasses("mt-1 text-sm text-red-500", errorClassName)}
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${selectId}-helptext`}
          className={joinClasses("mt-1 text-sm text-slate-500", errorClassName)}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default SelectDropdown;
