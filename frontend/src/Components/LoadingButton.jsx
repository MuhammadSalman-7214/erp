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
      className={`${className} ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
      {...props}
    >
      {children}
    </Button>
  );
}

export default LoadingButton;
