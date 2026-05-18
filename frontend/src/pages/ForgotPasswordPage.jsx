import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  clearPasswordResetSession,
  requestPasswordReset,
  resetPassword,
} from "../features/authSlice";
import InputField from "../Components/InputField";

const ForgotPasswordPage = () => {
  const RESET_CODE_EXPIRY_SECONDS = 5 * 60;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pendingPasswordResetSession, isForgotPasswordLoading, isResetPasswordLoading } =
    useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const expiredHandledRef = useRef(false);

  const resetSession = useMemo(
    () => pendingPasswordResetSession,
    [pendingPasswordResetSession],
  );
  const isResetStep = !!resetSession?.challengeId;

  const formatTimeLeft = (totalSeconds) => {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (resetSession?.email) {
      setEmail(resetSession.email);
    }
  }, [resetSession]);

  useEffect(() => {
    if (!resetSession?.challengeId) {
      setSecondsLeft(0);
      expiredHandledRef.current = false;
      return;
    }

    const expiryTime =
      (resetSession.createdAt || Date.now()) +
      (resetSession.expiresIn || RESET_CODE_EXPIRY_SECONDS) * 1000;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((expiryTime - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining <= 0 && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        localStorage.removeItem("pendingPasswordResetSession");
        dispatch(clearPasswordResetSession());
        setOtp("");
        setPassword("");
        setConfirmPassword("");
        toast.error("Reset code expired. Please request a new one.");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [dispatch, resetSession]);

  const handleRequestReset = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    try {
      const result = await dispatch(
        requestPasswordReset({ email: email.trim() }),
      ).unwrap();

      toast.success(
        result?.challengeId
          ? `Reset code sent to ${result.maskedEmail || result.email}.`
          : "If an account exists, a reset code has been sent.",
      );
    } catch (error) {
      toast.error(error || "Unable to request password reset");
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!resetSession?.challengeId) {
      toast.error("Reset session expired. Please request a new code.");
      return;
    }

    if (secondsLeft <= 0) {
      toast.error("Reset code expired. Please request a new code.");
      return;
    }

    if (!otp.trim()) {
      toast.error("Please enter the reset code");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await dispatch(
        resetPassword({
          challengeId: resetSession.challengeId,
          otp: otp.trim(),
          password,
          confirmPassword,
        }),
      ).unwrap();

      toast.success("Password reset successfully. Please log in.");
      dispatch(clearPasswordResetSession());
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error || "Unable to reset password");
    }
  };

  const handleBackToLogin = () => {
    localStorage.removeItem("pendingPasswordResetSession");
    dispatch(clearPasswordResetSession());
    setEmail("");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setSecondsLeft(0);
    expiredHandledRef.current = false;
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-teal-900">
            Forgot Password
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Request a reset code and create a new password in a secure step.
          </p>
        </div>

        {!isResetStep ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you@example.com"
            />

            <button
              type="submit"
              disabled={isForgotPasswordLoading}
              className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 disabled:opacity-70"
            >
              {isForgotPasswordLoading ? "Sending code..." : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="text-sm text-slate-700 font-medium">
                Reset code sent to{" "}
                <span className="text-teal-700">
                  {resetSession?.maskedEmail || resetSession?.email}
                </span>
              </p>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Code expires in</span>
              <span className="font-semibold text-red-600">
                {secondsLeft <= 0 ? "Expired" : formatTimeLeft(secondsLeft)}
              </span>
            </div>

            <InputField
              label="Reset Code"
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit code"
              inputClassName="text-center tracking-[0.35em]"
            />

            <InputField
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />

            <InputField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />

            <button
              type="submit"
              disabled={isResetPasswordLoading}
              className="w-full bg-teal-600 text-white p-3 rounded-md hover:bg-teal-700 disabled:opacity-70"
            >
              {isResetPasswordLoading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <button
          type="button"
          className="mt-4 w-full text-sm text-teal-700 hover:underline"
          onClick={handleBackToLogin}
        >
          Back to login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
