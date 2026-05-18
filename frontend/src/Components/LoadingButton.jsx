import { Button } from "antd";

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
      type={type === "submit" ? "primary" : "default"}
      htmlType={type}
      loading={loading}
      disabled={isDisabled}
      className={className}
      {...props}
    >
      {loading ? loadingText : children}
    </Button>
  );
}

export default LoadingButton;
