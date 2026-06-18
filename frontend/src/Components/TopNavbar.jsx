import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { formatDateLabel } from "../lib/dateFormat";
import { FiCalendar } from "react-icons/fi";
import { IoMdPulse } from "react-icons/io";
import { Settings2 } from "lucide-react";

function TopNavbar() {
  const { user } = useSelector((state) => state.auth);

  return (
    <nav className="flex h-[72px] w-full items-center justify-between border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,250,0.92))] px-3 shadow-[0_10px_24px_rgba(15,23,42,0.02)] lg:px-4">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-600 text-white shadow-[0_10px_24px_rgba(13,148,136,0.22)] ring-1 ring-white/70">
            <IoMdPulse className="text-base" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                Welcome back, {user?.name || "Guest"}
              </h1>
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <FiCalendar className="text-slate-400" />
                {formatDateLabel(new Date())}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex shrink-0 items-center justify-end">
          <Link to="/Profilepage">
            <Settings2 className="text-slate-700 hover:text-teal-600" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default TopNavbar;
