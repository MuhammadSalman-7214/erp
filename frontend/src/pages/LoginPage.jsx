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
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div
        className="w-full sm:w-1/2 bg-black p-10 text-white flex flex-col justify-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('https://www.transparenttextures.com/patterns/asfalt-dark.png')`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-50">
          <div className="w-64 h-64 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-3xl opacity-50"></div>
          <div className="w-48 h-48 bg-gradient-to-r from-green-600 to-teal-600 rounded-full blur-3xl opacity-50 absolute top-1/4 left-1/4"></div>
          <div className="w-32 h-32 bg-gradient-to-r from-pink-600 to-red-600 rounded-full blur-3xl opacity-50 absolute bottom-1/4 right-1/4"></div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-4">
            Efficient Inventory Management
          </h2>
          <p className="mb-6 text-gray-300">
            Streamline your operations with real-time tracking, automated
            reports, and seamless integrations.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
