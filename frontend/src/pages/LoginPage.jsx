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

      const roleRedirects = {
        admin: "/AdminDashboard",
        manager: "/ManagerDashboard",
        staff: "/StaffDashboard",
      };

      const userRole = result?.user?.role;
      toast.success(`Welcome back, ${result?.user?.name || "User"}!`);
      navigate(roleRedirects[userRole] || "/ManagerDashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Error in Login:", error);
      toast.error(error?.message || "Login failed. Please try again.");
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user?.role) {
      const roleRedirects = {
        admin: "/AdminDashboard",
        manager: "/ManagerDashboard",
        staff: "/StaffDashboard",
      };
      navigate(roleRedirects[user.role], { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-base-100 flex bg-gray-50">
      <div className="w-full sm:w-1/2 p-6 flex items-center justify-center bg-white shadow-lg rounded-xl">
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
              className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 transition duration-300"
            >
              Sign in
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
      <div className="hidden sm:flex w-1/2 bg-teal-900 px-12 py-16 items-center mx-auto justify-center">
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
            <div className="flex gap-4 items-start bg-teal-100 border border-slate-200 rounded-xl p-5 shadow-sm">
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

            <div className="flex gap-4 items-start bg-teal-100 border border-slate-200 rounded-xl p-5 shadow-sm">
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

            <div className="flex gap-4 items-start bg-teal-100 border border-slate-200 rounded-xl p-5 shadow-sm">
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
            © {new Date().getFullYear()} DevSouq Technologies — All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
