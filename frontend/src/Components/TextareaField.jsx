import React, { forwardRef } from "react";
import { Input } from "antd";

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

      <div className="mt-2">
        <Input.TextArea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`${textareaClassName}`.trim()}
          {...props}
        />
      </div>

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

export default TextareaField;
