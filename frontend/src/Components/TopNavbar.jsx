import { useSelector } from "react-redux";
import image from "../images/user.png";
import { Link } from "react-router-dom";

function TopNavbar() {
  const { user } = useSelector((state) => state.auth);

  const dashboardBasePath = (() => {
    switch (user?.role) {
      case "admin":
        return "/AdminDashboard";
      case "manager":
        return "/ManagerDashboard";
      case "staff":
        return "/StaffDashboard";
      default:
        return "/";
    }
  })();
  return (
    <nav className="bg-white border-b w-full h-[8vh] flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {user?.name || "Guest"}
        </h1>
        <p className="text-sm">
          Today is{" "}
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Link to={`${dashboardBasePath}/Profilepage`}>
            <img
              className="border-2 border-teal-500 h-12 w-12 rounded-full object-cover"
              src={user?.ProfilePic || image}
              alt="Profile"
            />
          </Link>
          <div className="text-left">
            <h1 className="text-gray-800 font-medium">
              {user?.name || "Guest"}
            </h1>
            <p className="text-gray-500 text-sm">{user?.role || "Visitor"}</p>
          </div>
        </div>
        {/* <ThemeToggle className="text-gray-600 text-xl cursor-pointer" /> */}
      </div>
    </nav>
  );
}

export default TopNavbar;
