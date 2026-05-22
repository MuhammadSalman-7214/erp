import React, { forwardRef } from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ").trim();

const variantStyles = {
  primary:
    "bg-teal-700 text-white shadow-sm hover:bg-teal-600 focus-visible:ring-teal-500",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  middle: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

const Button = forwardRef(function Button(
  {
    type = "button",
    htmlType,
    className = "",
    variant = "primary",
    size = "middle",
    loading = false,
    loadingText,
    disabled = false,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={htmlType || type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={joinClasses(
        "app-btn inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.middle,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          {loadingText ?? children ?? "Loading..."}
        </span>
      ) : (
        children
      )}
    </button>
  );
});

export default Button;
