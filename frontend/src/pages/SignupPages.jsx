import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../features/authSlice";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import InputField from "../Components/InputField";
import {
  validateEmailInput,
  validatePasswordInput,
  validateTextInput,
} from "../lib/formValidation";

const getDashboardPath = (role) => {
  if (role === "super_admin") return "/super-admin";
  return "/";
};

function SignupPage() {
  const { user, isUserSignup } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const schema = yup.object().shape({
    name: yup
      .string()
      .required("Name is required")
      .test("safe-name", "Name contains unsupported characters", (value) => {
        const result = validateTextInput(value, "Name", {
          required: true,
          minLength: 2,
          maxLength: 80,
        });
        return result.ok;
      }),
    email: yup
      .string()
      .required("Email is required")
      .test("safe-email", "Email contains unsupported characters", (value) => {
        const result = validateEmailInput(value);
        return result.ok;
      }),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be at most 128 characters")
      .required("Password is required")
      .test("safe-password", "Password contains unsupported characters", (value) => {
        const result = validatePasswordInput(value || "");
        return result.ok;
      }),
    // role: yup.string().required("Role is required"),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(signup(data)).unwrap();

      // Redirect based on role after successful signup
      const userRole =
        result?.savedUser?.role || result?.user?.role || data.role;
      toast.success(
        `Account created successfully! Welcome, ${result?.savedUser?.name || result?.user?.name || data.name}!`,
      );
      navigate(getDashboardPath(userRole));
    } catch (error) {
      toast.error(error || "Signup failed. Please try again.");
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user?.role) {
      navigate(getDashboardPath(user.role));
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-base-100 flex bg-gray-50">
      <div className="w-full sm:w-1/2 p-6 flex items-center justify-center bg-white shadow-lg rounded-xl">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-900">InventorySouq</h1>
            <p className="text-gray-600">by DevSouq Technologies</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <InputField
                  containerClassName="mb-6"
                  label="Name"
                  id="name"
                  placeholder="Your name"
                  {...field}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <InputField
                  containerClassName="mb-6"
                  label="Email"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...field}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <InputField
                  containerClassName="mb-6"
                  label="Password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...field}
                  error={errors.password?.message}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-gray-500 hover:text-teal-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <IoEyeOffOutline size={20} />
                      ) : (
                        <IoEyeOutline size={20} />
                      )}
                    </button>
                  }
                />
              )}
            />

            {/* <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Role
              </label>
              <SelectField
                label="Role"
                options={[
                  { label: "Staff", value: "staff" },
                  { label: "Admin", value: "admin" },
                  { label: "Manager", value: "manager" },
                ]}
                {...register("role")}
                error={errors.role?.message}
              />
            </div> */}

            {/* <div className="flex items-center mb-6">
              <input type="checkbox" id="terms" className="mr-2" />
              <label htmlFor="terms" className="text-gray-600 text-sm">
                Agree to terms and conditions
              </label>
            </div> */}

            <button
              type="submit"
              className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 transition duration-300"
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

      {/* RIGHT SIDE – Professional Info Panel with Dark Teal BG */}
      <div className="hidden sm:flex w-1/2 bg-teal-900 px-12 py-16 items-center mx-auto justify-center">
        <div className="max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Welcome back to InventorySouq
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
          <p className="text-xs text-teal-200 pt-4 text-center ">
            © {new Date().getFullYear()} DevSouq Technologies — All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
