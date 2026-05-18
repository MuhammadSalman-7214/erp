import React from "react";
import { Drawer, Button } from "antd";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";

const extractWidth = (widthClass) => {
  const match = String(widthClass || "").match(/\[(\d+)px\]/);
  return match ? Number(match[1]) : 420;
};

function DrawerPanel({
  open,
  title,
  onClose,
  isMinimized = false,
  onToggleMinimized,
  widthClass = "w-full sm:w-[420px]",
  className = "",
  headerClassName = "",
  bodyClassName = "",
  children,
}) {
  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={isMinimized ? 0 : extractWidth(widthClass)}
      closable={false}
      destroyOnClose={false}
      className={`erp-ant-drawer ${className}`.trim()}
      styles={{
        body: {
          padding: 0,
        },
        mask: {
          background: "rgba(15, 23, 42, 0.45)",
        },
        content: {
          overflow: "hidden",
        },
      }}
    >
      {isMinimized ? (
        <button
          type="button"
          onClick={onToggleMinimized}
          className="fixed right-0 top-1/2 z-[80] -translate-y-1/2 rounded-l-2xl bg-teal-700 px-3 py-4 text-white shadow-2xl transition hover:bg-teal-600"
          title="Maximize drawer"
          aria-label="Maximize drawer"
        >
          <FiMaximize2 size={18} />
        </button>
      ) : (
        <div className="h-full flex flex-col">
          <div
            className={`flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 ${headerClassName}`}
          >
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-800">
                {title}
              </h2>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                type="text"
                icon={<FiMinimize2 size={18} />}
                onClick={onToggleMinimized}
                aria-label="Minimize drawer"
              />
              <Button
                type="text"
                danger
                onClick={onClose}
                aria-label="Close drawer"
              >
                Close
              </Button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
        </div>
      )}
    </Drawer>
  );
}

export default DrawerPanel;
