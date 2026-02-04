import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../features/authSlice";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

function SignupPage() {
  const { user, isUserSignup } = useSelector((state) => state.auth);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [countries, setCountries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedRole, setSelectedRole] = useState("staff");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ✅ Check authentication and permissions
  useEffect(() => {
    const checkAuth = () => {
      if (!user) {
        toast.error("Please login first to create users");
        navigate("/login", { replace: true });
        return;
      }

      const allowedRoles = ["superadmin", "countryadmin", "branchadmin"];
      if (!allowedRoles.includes(user.role)) {
        toast.error("You don't have permission to create users");
        const roleRedirects = {
          staff: "/StaffDashboard",
          agent: "/AgentDashboard",
        };
        navigate(roleRedirects[user.role] || "/", { replace: true });
        return;
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [user, navigate]);

  // Validation schema
  const schema = yup.object().shape({
    name: yup.string().required("Name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    role: yup.string().required("Role is required"),
    countryId: yup.string().when("role", {
      is: (role) =>
        ["countryadmin", "branchadmin", "staff", "agent"].includes(role),
      then: (schema) => schema.required("Country is required for this role"),
      otherwise: (schema) => schema.notRequired(),
    }),
    branchId: yup.string().when("role", {
      is: (role) => ["branchadmin", "staff", "agent"].includes(role),
      then: (schema) => schema.required("Branch is required for this role"),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      role: "staff",
      countryId: "",
      branchId: "",
    },
  });

  const watchRole = watch("role", "staff");
  const watchedCountryId = watch("countryId");

  // ✅ Fetch countries ONLY for superadmin (countryadmin and branchadmin already have their country in user)
  useEffect(() => {
    if (isCheckingAuth) return;

    if (user?.role === "superadmin") {
      const fetchCountries = async () => {
        try {
          const response = await axiosInstance.get("/country");
          setCountries(response.data);
        } catch (error) {
          toast.error("Failed to load countries");
        }
      };
      fetchCountries();
    } else {
      // For countryadmin/branchadmin, just use the populated country from user
      setCountries([user.country]); // user.country = { _id, name, code, ... }
    }
  }, [isCheckingAuth, user?.role]);

  // ✅ Set default countryId for countryadmin / branchadmin from user object
  useEffect(() => {
    if (isCheckingAuth) return;

    if (
      (user?.role === "countryadmin" || user?.role === "branchadmin") &&
      user?.countryId?._id
    ) {
      setValue("countryId", user.countryId._id);
    }
  }, [isCheckingAuth, user, setValue]);

  // ✅ Fetch branches: skip API call for branchadmin since user.branch is already populated
  useEffect(() => {
    if (!watchedCountryId) {
      setBranches([]);
      return;
    }

    // branchadmin already has branch data in user object — no API call needed
    if (user?.role === "branchadmin" && user?.branch) {
      setBranches([user.branch]); // user.branch = { _id, name, city, branchCode }
      setValue("branchId", user.branch._id);
      return;
    }

    // countryadmin and superadmin need to fetch branches
    const fetchBranches = async () => {
      try {
        const countryIdString = watchedCountryId._id
          ? watchedCountryId._id
          : watchedCountryId;
        const response = await axiosInstance.get(
          `/branch/country/${countryIdString}`,
        );
        setBranches(response.data);
      } catch {
        toast.error("Failed to load branches");
      }
    };

    fetchBranches();
  }, [watchedCountryId, user?.role, user?.branch, setValue]);

  // Update selected role
  useEffect(() => {
    setSelectedRole(watchRole);
  }, [watchRole]);

  const onSubmit = async (data) => {
    try {
      if (user?.role === "countryadmin") {
        data.countryId = user.countryId._id;
      }

      if (user?.role === "branchadmin") {
        data.countryId = user.countryId._id;
        data.branchId = user.branch._id;
      }

      await dispatch(signup(data)).unwrap();

      toast.success(`User ${data.name} created successfully!`);

      reset({
        role: "staff",
        countryId:
          user?.role === "countryadmin" || user?.role === "branchadmin"
            ? user.countryId._id
            : "",
        branchId: user?.role === "branchadmin" ? user.branch._id : "",
      });

      if (user?.role !== "branchadmin") {
        setBranches([]);
      }

      const userManagementPath = {
        superadmin: "/SuperAdminDashboard/users",
        countryadmin: "/CountryAdminDashboard/users",
        branchadmin: "/BranchAdminDashboard/users",
      };

      navigate(userManagementPath[user?.role] || "/");
    } catch (error) {
      toast.error(error || "Failed to create user. Please try again.");
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex bg-gray-50">
      <div className="w-full sm:w-1/2 p-6 flex items-center justify-center bg-white shadow-lg rounded-xl">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-900">InventoryPro</h1>
            <p className="text-gray-600">by DevSouq Technologies</p>
            <p className="text-sm text-gray-500 mt-2">
              Create New User Account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Name Field */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Enter user's full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="user@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Minimum 6 characters"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Role Field */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register("role")}
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-gray-700"
              >
                {user?.role === "superadmin" && (
                  <>
                    <option value="staff">Staff</option>
                    <option value="agent">Clearing Agent</option>
                    <option value="branchadmin">Branch Admin</option>
                    <option value="countryadmin">Country Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </>
                )}
                {user?.role === "countryadmin" && (
                  <>
                    <option value="staff">Staff</option>
                    <option value="agent">Clearing Agent</option>
                    <option value="branchadmin">Branch Admin</option>
                  </>
                )}
                {user?.role === "branchadmin" && (
                  <>
                    <option value="staff">Staff</option>
                    <option value="agent">Clearing Agent</option>
                  </>
                )}
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Country Field */}
            {["countryadmin", "branchadmin", "staff", "agent"].includes(
              selectedRole,
            ) && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("countryId")}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-md ${user?.role !== "superadmin" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  disabled={user?.role !== "superadmin"}
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country._id} value={country._id}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
                {(user?.role === "countryadmin" ||
                  user?.role === "branchadmin") && (
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-selected based on your assignment
                  </p>
                )}
                {errors.countryId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.countryId.message}
                  </p>
                )}
              </div>
            )}

            {/* Branch Field */}
            {["branchadmin", "staff", "agent"].includes(selectedRole) &&
              watchedCountryId && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("branchId")}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-gray-700 ${user?.role === "branchadmin" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    disabled={user?.role === "branchadmin"}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} - {branch.city}
                      </option>
                    ))}
                  </select>
                  {user?.role === "branchadmin" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-selected based on your assignment
                    </p>
                  )}
                  {errors.branchId && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.branchId.message}
                    </p>
                  )}
                </div>
              )}

            {/* Info Box */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> User will receive login credentials and
                must change password on first login.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={isUserSignup}
            >
              {isUserSignup ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating User...
                </span>
              ) : (
                "Create User Account"
              )}
            </button>
          </form>

          {/* Back to Dashboard Link */}
          <div className="text-center mt-6">
            <Link
              to={
                user?.role === "superadmin"
                  ? "/SuperAdminDashboard"
                  : user?.role === "countryadmin"
                    ? "/CountryAdminDashboard"
                    : "/BranchAdminDashboard"
              }
              className="text-teal-600 text-sm hover:underline inline-flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="hidden sm:flex w-1/2 bg-teal-900 px-12 py-16 items-center mx-auto justify-center">
        <div className="max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3">
              User Management
            </h2>
            <p className="text-teal-100 leading-relaxed text-center">
              Create and manage user accounts with role-based access control for
              your organization.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4 items-start bg-teal-100 border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="p-3 rounded-lg bg-teal-600 text-white text-2xl">
                👥
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">
                  Role-Based Access
                </h4>
                <p className="text-sm text-slate-600">
                  Assign appropriate roles with hierarchical permissions.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-teal-100 border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="p-3 rounded-lg bg-teal-600 text-white text-2xl">
                🌍
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">
                  Multi-Location Support
                </h4>
                <p className="text-sm text-slate-600">
                  Manage users across multiple countries and branches.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-teal-100 border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="p-3 rounded-lg bg-teal-600 text-white text-2xl">
                🔒
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">
                  Secure Access Control
                </h4>
                <p className="text-sm text-slate-600">
                  Users inherit permissions based on their organizational scope.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-teal-200 pt-4 text-center">
            © {new Date().getFullYear()} DevSouq Technologies — All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
