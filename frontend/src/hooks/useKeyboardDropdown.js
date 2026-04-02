import { useEffect, useRef, useState } from "react";

function useKeyboardDropdown({
  options = [],
  isOpen = false,
  onSelect,
  onClose,
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIndexRef = useRef(-1);

  const syncActiveIndex = (nextIndex) => {
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    if (!isOpen || options.length === 0) {
      syncActiveIndex(-1);
      return;
    }

    const next = activeIndexRef.current < 0
      ? 0
      : Math.min(activeIndexRef.current, options.length - 1);
    syncActiveIndex(next);
  }, [isOpen, options.length]);

  const onKeyDown = (event) => {
    if (!isOpen || options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const current = activeIndexRef.current;
      syncActiveIndex(current < 0 ? 0 : (current + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const current = activeIndexRef.current;
      syncActiveIndex(current <= 0 ? options.length - 1 : current - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const current =
        activeIndexRef.current >= 0 ? activeIndexRef.current : 0;
      if (options[current]) {
        onSelect?.(options[current], current);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      syncActiveIndex(-1);
    }
  };

  return {
    activeIndex,
    onKeyDown,
    setActiveIndex: syncActiveIndex,
  };
}

export default useKeyboardDropdown;
