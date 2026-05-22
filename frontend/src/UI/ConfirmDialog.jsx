import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "./Button";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ").trim();

function ConfirmDialog({
  title,
  description,
  confirmText,
  okText,
  cancelText = "Cancel",
  onConfirm,
  danger = true,
  okButtonProps = {},
  cancelButtonProps = {},
  children,
  ..._ignoredProps
}) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dialogId = useId();
  const { className: okButtonClassName, ...restOkButtonProps } = okButtonProps;
  const {
    className: cancelButtonClassName,
    ...restCancelButtonProps
  } = cancelButtonProps;

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const trigger = isValidElement(children) ? Children.only(children) : null;

  const handleTriggerClick = (event) => {
    trigger?.props?.onClick?.(event);

    if (event.defaultPrevented || trigger?.props?.disabled) {
      return;
    }

    setOpen(true);
  };

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await Promise.resolve(onConfirm?.());
      setOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {trigger ? cloneElement(trigger, { onClick: handleTriggerClick }) : null}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
            aria-labelledby={dialogId}
            role="presentation"
          >
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
                <div
                  className={joinClasses(
                    "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    danger ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600",
                  )}
                >
                  <FiAlertTriangle size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id={dialogId}
                    className="text-lg font-semibold text-slate-900"
                  >
                    {title}
                  </h3>
                  {description ? (
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {description}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className={joinClasses(
                    "rounded-xl border-slate-200 px-4 py-2.5 text-slate-700 hover:bg-slate-50",
                    cancelButtonClassName,
                  )}
                  {...restCancelButtonProps}
                >
                  {cancelText}
                </Button>
                <Button
                  type="button"
                  variant={danger ? "danger" : "primary"}
                  loading={isProcessing}
                  onClick={handleConfirm}
                  className={joinClasses(
                    "rounded-xl px-4 py-2.5",
                    !danger ? "bg-teal-700 hover:bg-teal-600" : "",
                    okButtonClassName,
                  )}
                  {...restOkButtonProps}
                >
                  {confirmText ?? okText ?? "Confirm"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default ConfirmDialog;
