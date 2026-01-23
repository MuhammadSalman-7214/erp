import { useSelector } from "react-redux";
import image from "../images/user.png";
import { Link } from "react-router-dom";

function TopNavbar() {
  const { Authuser, isUserSignup } = useSelector((state) => state.auth);

  return (
    <nav className="bg-white border-b w-full h-[8vh] flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {Authuser?.name || "Guest"}
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
          <Link to="/ManagerDashboard/Profilepage">
            <img
              className="border-2 border-teal-500 h-12 w-12 rounded-full object-cover"
              src={Authuser?.ProfilePic || image}
              alt="Profile"
            />
          </Link>
          <div className="text-left">
            <h1 className="text-gray-800 font-medium">
              {Authuser?.name || "Guest"}
            </h1>
            <p className="text-gray-500 text-sm">
              {Authuser?.role || "Visitor"}
            </p>
          </div>
        </div>
        {/* <ThemeToggle className="text-gray-600 text-xl cursor-pointer" /> */}
      </div>
    </nav>
  );
}

export default TopNavbar;
