import React, { forwardRef } from "react";
import { Select } from "antd";

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

const selectThemeClass =
  "erp-ant-select w-full rounded-xl";

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
  const normalizedOptions = options.map((option) => normalizeOption(option));
  const currentValue = props.value ?? props.defaultValue ?? "";

  const emitChange = (value, option) => {
    if (typeof props.onChange !== "function") return;

    props.onChange({
      target: { value, name: props.name, id: selectId },
      currentTarget: { value, name: props.name, id: selectId },
    }, option);
  };

  const emitBlur = () => {
    if (typeof props.onBlur !== "function") return;

    props.onBlur({
      target: { value: currentValue, name: props.name, id: selectId },
      currentTarget: { value: currentValue, name: props.name, id: selectId },
    });
  };

  return (
    <div className={containerClassName}>
      {label ? (
        <label
          htmlFor={selectId}
          className={`block text-sm font-semibold tracking-wide text-slate-700 ${labelClassName}`}
        >
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </label>
      ) : null}

      <div className="mt-2">
        <Select
          ref={ref}
          id={selectId}
          placeholder={placeholder}
          options={children ? undefined : normalizedOptions}
          className={`${selectThemeClass} ${selectClassName}`.trim()}
          dropdownClassName="erp-ant-select-dropdown"
          popupClassName="erp-ant-select-dropdown"
          suffixIcon={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-teal-700 shadow-sm">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M6 8l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          }
          value={props.value}
          defaultValue={props.defaultValue}
          disabled={props.disabled}
          allowClear={props.allowClear}
          mode={props.mode}
          showSearch={props.showSearch}
          filterOption={props.filterOption}
          optionFilterProp={props.optionFilterProp}
          onChange={emitChange}
          onBlur={emitBlur}
          onFocus={props.onFocus}
          onSearch={props.onSearch}
        >
          {children}
        </Select>
      </div>

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

export default SelectField;
