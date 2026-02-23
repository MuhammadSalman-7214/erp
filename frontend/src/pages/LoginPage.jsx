import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import * as yup from "yup";
import { login } from "../features/authSlice";
import toast from "react-hot-toast";

function LoginPage() {
  const { user } = useSelector((state) => state.auth);
  const { isLoginLoading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const schema = yup.object().shape({
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(login(data)).unwrap();
      // ✅ FIXED: Updated role redirects to match new hierarchy
      const roleRedirects = {
        superadmin: "/SuperAdminDashboard",
        countryadmin: "/CountryAdminDashboard",
        branchadmin: "/BranchAdminDashboard",
        staff: "/StaffDashboard",
        agent: "/AgentDashboard",
      };

      const userRole = result?.user?.role;

      if (!roleRedirects[userRole]) {
        toast.error("Invalid user role. Please contact administrator.");
        return;
      }

      toast.success(`Welcome back, ${result?.user?.name || "User"}!`);
      navigate(roleRedirects[userRole], { replace: true });
    } catch (error) {
      console.error("Error in Login:", error);
      toast.error(error || "Login failed. Please try again.");
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user?.role) {
      const roleRedirects = {
        superadmin: "/SuperAdminDashboard",
        countryadmin: "/CountryAdminDashboard",
        branchadmin: "/BranchAdminDashboard",
        staff: "/StaffDashboard",
        agent: "/AgentDashboard",
      };

      const redirectPath = roleRedirects[user.role];
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-base-100 flex bg-gray-50">
      <div className="w-full sm:w-1/2 p-6 flex items-center justify-center app-card app-surface-static">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-900">InventoryPro</h1>
            <p className="text-gray-600">by DevSouq Technologies</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                {...register("email")}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                {...register("password")}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center mb-6">
              <input type="checkbox" id="terms" className="mr-2" />
              <label htmlFor="terms" className="text-gray-600 text-sm">
                Agree on terms and conditions
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoginLoading} // disable while loading
              className={`w-full p-3 rounded-md text-white transition duration-300 
    ${isLoginLoading ? "bg-teal-600 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"}`}
            >
              {isLoginLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p>
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-teal-600 text-sm hover:underline"
              >
                Click here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE – Professional Info Panel with Dark Teal BG */}
      <div className="hidden sm:flex w-1/2 bg-teal-700 px-12 py-16 items-center mx-auto justify-center">
        <div className="max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Welcome back to InventoryPro
            </h2>
            <p className="text-teal-100 leading-relaxed text-center">
              A secure and reliable ERP platform designed to simplify inventory,
              sales, and business operations.
            </p>
          </div>

          {/* Feature List – Cards untouched */}
          <div className="space-y-5">
            <div className="app-card p-5 flex gap-4 items-start">
              <div className="p-3 rounded-lg bg-teal-600 text-teal-700">📦</div>
              <div>
                <h4 className="font-semibold text-slate-800">
                  Centralized Inventory
                </h4>
                <p className="text-sm text-slate-600">
                  Track stock levels and warehouse data in real time.
                </p>
              </div>
            </div>

            <div className="app-card p-5 flex gap-4 items-start">
              <div className="p-3 rounded-lg bg-teal-600 text-blue-700">📊</div>
              <div>
                <h4 className="font-semibold text-slate-800">
                  Business Insights
                </h4>
                <p className="text-sm text-slate-600">
                  Analyze sales, revenue, and performance with clarity.
                </p>
              </div>
            </div>

            <div className="app-card p-5 flex gap-4 items-start">
              <div className="p-3 rounded-lg bg-teal-600 text-purple-700">
                🔒
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">
                  Secure Access Control
                </h4>
                <p className="text-sm text-slate-600">
                  Role-based access for Admins, Managers, and Staff.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-teal-200 pt-4 text-center">
            © {new Date().getFullYear()} <b> DevSouq Technologies </b> — All
            rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
