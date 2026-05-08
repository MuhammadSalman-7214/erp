import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import * as yup from "yup";
import {
  clearPendingOtpSession,
  login,
  verifyOtp,
} from "../features/authSlice";
import toast from "react-hot-toast";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import {
  hasUnsafeInput,
  validateEmailInput,
  validatePasswordInput,
} from "../lib/formValidation";

const getDashboardPath = (role) => {
  if (role === "super_admin") return "/super-admin";
  return "/";
};

const OTP_BYPASS_EMAIL = "client.test@devsouq.pk";

function LoginPage() {
  const { user, isLoginLoading, pendingOtpSession, isOtpVerifying } =
    useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const expiredHandledRef = useRef(false);

  const schema = yup.object().shape({
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
      .test(
        "safe-password",
        "Password contains unsupported characters",
        (value) => {
          const result = validatePasswordInput(value || "");
          return result.ok;
        },
      ),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const otpSession = useMemo(() => pendingOtpSession, [pendingOtpSession]);
  const isOtpStep = !!otpSession?.challengeId;
  const emailValue = String(watch("email") || "").trim().toLowerCase();
  const isOtpBypassEmail = emailValue === OTP_BYPASS_EMAIL;

  useEffect(() => {
    if (user?.role) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!otpSession?.challengeId) {
      setOtp("");
      setSecondsLeft(60);
      expiredHandledRef.current = false;
      return;
    }

    const expiryTime =
      (otpSession.createdAt || Date.now()) +
      (otpSession.expiresIn || 60) * 1000;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((expiryTime - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining <= 0 && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        localStorage.removeItem("pendingOtpSession");
        dispatch(clearPendingOtpSession());
        setOtp("");
        toast.error("OTP expired. Please sign in again to request a new code.");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [dispatch, otpSession]);

  useEffect(() => {
    if (!isOtpStep) {
      expiredHandledRef.current = false;
    }
  }, [isOtpStep]);

  const handleLogin = async (data) => {
    try {
      const emailCheck = validateEmailInput(data.email);
      if (!emailCheck.ok) {
        toast.error(emailCheck.message);
        return;
      }

      const passwordCheck = validatePasswordInput(data.password);
      if (!passwordCheck.ok) {
        toast.error(passwordCheck.message);
        return;
      }

      const result = await dispatch(login(data)).unwrap();

      if (result?.otpRequired) {
        toast.success(
          `One time OTP sent to ${result.maskedEmail || result.email}. It expires in 1 minute.`,
        );
        return;
      }

      const userRole = result?.user?.role;
      toast.success(`Welcome back, ${result?.user?.name || "User"}!`);
      navigate(getDashboardPath(userRole), {
        replace: true,
      });
    } catch (error) {
      console.error("Error in Login:", error);
      toast.error(error || "Login failed. Please try again.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpSession?.challengeId) {
      toast.error("OTP session expired. Please sign in again.");
      return;
    }

    if (secondsLeft <= 0) {
      toast.error("OTP expired. Please sign in again.");
      return;
    }

    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    if (hasUnsafeInput(otp)) {
      toast.error("OTP contains unsupported characters");
      return;
    }

    try {
      const result = await dispatch(
        verifyOtp({
          challengeId: otpSession.challengeId,
          otp: otp.trim(),
        }),
      ).unwrap();

      toast.success(`Welcome back, ${result?.user?.name || "User"}!`);
      navigate(getDashboardPath(result?.user?.role), {
        replace: true,
      });
    } catch (error) {
      console.error("Error in OTP verification:", error);
      toast.error(error || "OTP verification failed. Please try again.");
    }
  };

  const onSubmit = async (data) => {
    if (isOtpStep) {
      await handleVerifyOtp();
      return;
    }

    await handleLogin(data);
  };

  return (
    <div className="min-h-screen bg-base-100 flex bg-gray-50">
      <div className="w-full sm:w-1/2 p-6 flex items-center justify-center bg-white shadow-lg rounded-xl">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-900">InventorySouq</h1>
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
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ textTransform: "none" }}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 !normal-case"
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{ textTransform: "none" }}
                  className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 !normal-case"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-teal-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <IoEyeOffOutline size={20} />
                  ) : (
                    <IoEyeOutline size={20} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {isOtpStep && (
              <div className="mb-6">
                <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 mb-4">
                  <p className="text-sm text-gray-700 font-medium">
                    One time OTP sent to your email{" "}
                    <span className="text-teal-700">
                      {otpSession?.maskedEmail || otpSession?.email}
                    </span>
                  </p>
                </div>

                <div className="flex justify-between">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    OTP
                  </label>
                  <span className="text-sm font-semibold text-red-600">
                    {secondsLeft <= 0 ? "Expired" : `${secondsLeft}s`}
                  </span>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit OTP"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-center tracking-[0.35em] !normal-case"
                />
              </div>
            )}

            {/* <div className="flex items-center mb-6">
              <input type="checkbox" id="terms" className="mr-2" />
              <label htmlFor="terms" className="text-gray-600 text-sm">
                Agree on terms and conditions
              </label>
            </div> */}

            <button
              type="submit"
              className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 transition duration-300 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={
                isLoginLoading ||
                isOtpVerifying ||
                (isOtpStep && secondsLeft <= 0)
              }
            >
              {isOtpStep
                ? isOtpVerifying
                  ? "Verifying OTP..."
                  : "Verify and continue"
                : isLoginLoading
                  ? isOtpBypassEmail
                    ? "Logging in..."
                    : "Getting OTP..."
                  : isOtpBypassEmail
                    ? "Login"
                    : "Get OTP"}
            </button>

            <div className="mt-3 text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-teal-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          {/* <div className="text-center mt-6">
            <p>
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-teal-600 text-sm hover:underline"
              >
                Click here
              </Link>
            </p>
          </div> */}
        </div>
      </div>

      {/* RIGHT SIDE – Professional Info Panel with Dark Teal BG */}
      <div className="hidden sm:flex w-1/2 bg-teal-900 px-12 py-16 items-center mx-auto justify-center">
        <div className="max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3 text-center">
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
