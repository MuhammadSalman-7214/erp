// pages/SetupPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

const schema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

function SetupPage() {
  const navigate = useNavigate();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  // Check if setup is already complete
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await axiosInstance.get("/auth/check-setup");
        if (response.data.setupComplete) {
          setIsSetupComplete(true);
          toast.error("Setup already completed. Please login.");
          navigate("/login");
        }
      } catch (error) {
        // Setup not complete, allow access
      }
    };
    checkSetup();
  }, [navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/setup-admin", data);
      toast.success("Super Admin created successfully! Please login.");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSetupComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full app-card app-surface-static p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-900">Initial Setup</h1>
          <p className="text-gray-600 mt-2">Create Super Admin Account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Name
            </label>
            <input
              type="text"
              {...register("name")}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Your name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="admin@example.com"
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
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 transition duration-300 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Super Admin"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          This is a one-time setup. After creating the super admin, you'll be
          redirected to login.
        </p>
      </div>
    </div>
  );
}

export default SetupPage;
