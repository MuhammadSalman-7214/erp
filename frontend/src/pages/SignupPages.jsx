import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../features/authSlice";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";

function SignupPage() {
  const { user, isUserSignup } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const schema = yup.object().shape({
    name: yup.string().required("Name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    role: yup.string().required("Role is required"),
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
      const result = await dispatch(signup(data)).unwrap();

      // Redirect based on role after successful signup
      const roleRedirects = {
        admin: "/AdminDashboard",
        manager: "/ManagerDashboard",
        staff: "/StaffDashboard",
      };

      const userRole = result?.user?.role || data.role;
      const redirectPath = roleRedirects[userRole] || "/";

      toast.success(
        `Account created successfully! Welcome, ${result?.user?.name || data.name}!`,
      );
      navigate(redirectPath);
    } catch (error) {
      console.error("Error in Signup:", error);
      toast.error(error?.message || "Signup failed. Please try again.");
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
      navigate(roleRedirects[user.role] || "/");
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
              <label
                htmlFor="name"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Email
              </label>
              <input
                id="email"
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
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                id="password"
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

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Role
              </label>
              <select
                {...register("role")}
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div className="flex items-center mb-6">
              <input type="checkbox" id="terms" className="mr-2" />
              <label htmlFor="terms" className="text-gray-600 text-sm">
                Agree to terms and conditions
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition duration-300"
              disabled={isUserSignup}
            >
              {isUserSignup ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          <div className="text-center mt-6">
            <p>
              Already have an account?
              <Link
                to="/login"
                className="text-teal-600 text-sm hover:underline ml-1"
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

export default SignupPage;
