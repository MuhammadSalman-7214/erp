import React, { forwardRef } from "react";
import { Input } from "antd";

const baseInputClass = "w-full";

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
  const commonProps = {
    name: props.name,
    className: `${baseInputClass} ${inputClassName}`.trim(),
    disabled: props.disabled,
    placeholder: props.placeholder,
    maxLength: props.maxLength,
    min: props.min,
    max: props.max,
    step: props.step,
    inputMode: props.inputMode,
    autoComplete: props.autoComplete,
    autoCapitalize: props.autoCapitalize,
    autoCorrect: props.autoCorrect,
    spellCheck: props.spellCheck,
    readOnly: props.readOnly,
    onChange: props.onChange,
    onBlur: props.onBlur,
    onFocus: props.onFocus,
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
    onKeyPress: props.onKeyPress,
    value: props.value,
    defaultValue: props.defaultValue,
  };

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
        {type === "password" ? (
          <Input.Password
            ref={ref}
            id={inputId}
            name={commonProps.name}
            type={type}
            prefix={prefix}
            suffix={suffix}
            className={commonProps.className}
            disabled={commonProps.disabled}
            placeholder={commonProps.placeholder}
            maxLength={commonProps.maxLength}
            min={commonProps.min}
            max={commonProps.max}
            step={commonProps.step}
            inputMode={commonProps.inputMode}
            autoComplete={commonProps.autoComplete}
            autoCapitalize={commonProps.autoCapitalize}
            autoCorrect={commonProps.autoCorrect}
            spellCheck={commonProps.spellCheck}
            readOnly={commonProps.readOnly}
            onChange={commonProps.onChange}
            onBlur={commonProps.onBlur}
            onFocus={commonProps.onFocus}
            onKeyDown={commonProps.onKeyDown}
            onKeyUp={commonProps.onKeyUp}
            onKeyPress={commonProps.onKeyPress}
            value={commonProps.value}
            defaultValue={commonProps.defaultValue}
            visibilityToggle={props.visibilityToggle}
          />
        ) : (
          <Input
            ref={ref}
            id={inputId}
            name={commonProps.name}
            type={type}
            prefix={prefix}
            suffix={suffix}
            className={commonProps.className}
            disabled={commonProps.disabled}
            placeholder={commonProps.placeholder}
            maxLength={commonProps.maxLength}
            min={commonProps.min}
            max={commonProps.max}
            step={commonProps.step}
            inputMode={commonProps.inputMode}
            autoComplete={commonProps.autoComplete}
            autoCapitalize={commonProps.autoCapitalize}
            autoCorrect={commonProps.autoCorrect}
            spellCheck={commonProps.spellCheck}
            readOnly={commonProps.readOnly}
            onChange={commonProps.onChange}
            onBlur={commonProps.onBlur}
            onFocus={commonProps.onFocus}
            onKeyDown={commonProps.onKeyDown}
            onKeyUp={commonProps.onKeyUp}
            onKeyPress={commonProps.onKeyPress}
            value={commonProps.value}
            defaultValue={commonProps.defaultValue}
          />
        )}
      </div>

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

export default InputField;
