import React, {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ").trim();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function Tooltip({
  content,
  children,
  placement = "top",
  delay = 120,
  offset = 10,
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimerRef = useRef(null);
  const tooltipId = useId();

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const closeTooltip = useCallback(() => {
    clearShowTimer();
    setOpen(false);
    setPosition(null);
  }, [clearShowTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;
    const preferredPlacement = placement === "bottom" ? "bottom" : "top";
    const canFitTop = rect.top >= tooltipRect.height + offset + padding;
    const canFitBottom =
      viewportHeight - rect.bottom >= tooltipRect.height + offset + padding;

    let resolvedPlacement = preferredPlacement;
    if (preferredPlacement === "top" && !canFitTop && canFitBottom) {
      resolvedPlacement = "bottom";
    } else if (preferredPlacement === "bottom" && !canFitBottom && canFitTop) {
      resolvedPlacement = "top";
    }

    const top =
      resolvedPlacement === "top"
        ? rect.top - tooltipRect.height - offset
        : rect.bottom + offset;
    const left = clamp(
      rect.left + rect.width / 2,
      padding + tooltipRect.width / 2,
      viewportWidth - padding - tooltipRect.width / 2,
    );

    setPosition({
      top: clamp(
        top,
        padding,
        Math.max(padding, viewportHeight - tooltipRect.height - padding),
      ),
      left,
      placement: resolvedPlacement,
    });
  }, [offset, placement]);

  const handleShow = useCallback(() => {
    if (disabled || !content) return;
    clearShowTimer();
    showTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, delay);
  }, [clearShowTimer, content, delay, disabled]);

  useEffect(() => {
    if (!open) return undefined;

    const raf = window.requestAnimationFrame(updatePosition);

    const handleWindowChange = () => updatePosition();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeTooltip();
      }
    };

    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, content, offset, placement, closeTooltip, updatePosition]);

  useEffect(() => {
    return () => clearShowTimer();
  }, [clearShowTimer]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();
    const ObserverClass = window.ResizeObserver;
    if (!ObserverClass) {
      return undefined;
    }

    const observer = new ObserverClass(() => updatePosition());
    if (tooltipRef.current) {
      observer.observe(tooltipRef.current);
    }

    return () => observer.disconnect();
  }, [open, updatePosition]);

  const trigger = isValidElement(children) ? Children.only(children) : null;

  if (!trigger) {
    return null;
  }

  const wrappedTrigger = cloneElement(trigger, {
    ref: triggerRef,
    "aria-describedby": open ? tooltipId : trigger.props["aria-describedby"],
    onMouseEnter: (event) => {
      trigger.props.onMouseEnter?.(event);
      handleShow();
    },
    onMouseLeave: (event) => {
      trigger.props.onMouseLeave?.(event);
      closeTooltip();
    },
    onFocus: (event) => {
      trigger.props.onFocus?.(event);
      handleShow();
    },
    onBlur: (event) => {
      trigger.props.onBlur?.(event);
      closeTooltip();
    },
    onClick: (event) => {
      trigger.props.onClick?.(event);
      closeTooltip();
    },
  });

  return (
    <>
      {wrappedTrigger}
      {open && content
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className={joinClasses(
                "fixed z-[110] pointer-events-none max-w-xs rounded-xl bg-teal-100 px-3 py-2 text-xs font-medium text-slate-600 border border-teal-300 shadow-xl transition-opacity duration-150",
                className,
              )}
              style={{
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                transform:
                  position?.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default Tooltip;
