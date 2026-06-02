import { Button } from "../UI";

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
    <Button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      loading={loading}
      loadingText={loadingText}
      className={`${className} ${isDisabled ? "cursor-not-allowed opacity-70" : ""} app-btn inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      {...props}
    >
      {children}
    </Button>
  );
}

export default LoadingButton;
