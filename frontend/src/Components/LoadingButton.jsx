import { FiLoader } from "react-icons/fi";

function LoadingButton({
  loading = false,
  loadingText = "Saving...",
  disabled = false,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${className} ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <FiLoader className="h-4 w-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default LoadingButton;
