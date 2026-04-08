import { useSelector } from "react-redux";
import image from "../images/user.png";
import { Link } from "react-router-dom";
import { formatDateLabel } from "../lib/dateFormat";

function TopNavbar() {
  const { user } = useSelector((state) => state.auth);

  return (
    <nav className="bg-white w-full h-[72px] flex items-center justify-between px-8 border-b border-gray-200 shadow-sm">
      {/* LEFT */}
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-gray-900">
          Welcome back, {user?.name || "Guest"}
        </h1>
        <p className="text-sm text-gray-500">
          {formatDateLabel(new Date())}
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-[1px] bg-gray-200" /> {/* Divider */}
        <Link
          to="/Profilepage"
          className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition"
        >
          <img
            className="h-10 w-10 rounded-full object-cover border border-gray-300"
            src={user?.ProfilePic || image}
            alt="Profile"
          />

          <div className="text-left leading-tight">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || "Guest"}
            </p>
            <p className="text-xs text-gray-500">{user?.role || "Visitor"}</p>
          </div>
        </Link>
      </div>
    </nav>
  );
}

export default TopNavbar;
