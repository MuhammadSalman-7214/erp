import { FiMaximize2, FiMinimize2 } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import { Button } from "../UI";

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
    <>
      {!isMinimized && (
        <div className="fixed inset-0 z-[60] bg-black/40" aria-hidden="true" />
      )}

      {isMinimized ? (
        <Button
          type="button"
          onClick={onToggleMinimized}
          className="fixed right-0 top-1/2 z-[80] -translate-y-1/2 rounded-l-2xl bg-teal-700 px-3 py-4 text-white shadow-2xl transition hover:bg-teal-600 "
          title="Maximize drawer"
          aria-label="Maximize drawer"
        >
          <FiMaximize2 size={18} />
        </Button>
      ) : (
        <div
          className={`fixed right-0 top-0 z-[70] flex h-full ${widthClass} flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-in-out ${className}`}
        >
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
                type="button"
                onClick={onToggleMinimized}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Minimize drawer"
                aria-label="Minimize drawer"
              >
                <FiMinimize2 size={18} />
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <MdClose size={20} />
              </Button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export default DrawerPanel;
