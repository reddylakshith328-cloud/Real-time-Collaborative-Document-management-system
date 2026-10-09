import { useEffect, useState } from "react";

import {
  FileText,
  Lock,
  Mail,
  User,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

import {
  loginUser,
  sendRegistrationOTP,
  verifyRegistrationOTP,
} from "./services/api";

import Dashboard from "./pages/Dashboard";

import "./App.css";


function App() {
  // =========================================================
  // LOGIN / REGISTER / OTP
  // =========================================================

  const [isRegistering, setIsRegistering] = useState(false);
  const [otpStep, setOtpStep] = useState(false);

  // =========================================================
  // FORM DATA
  // =========================================================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // =========================================================
  // STATUS
  // =========================================================

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================================================
  // OTP TIMER
  // =========================================================

  const [otpTimeLeft, setOtpTimeLeft] = useState(60);

  // =========================================================
  // AUTH TOKEN
  // =========================================================

  const [token, setToken] = useState(
    localStorage.getItem("access_token")
  );

  // =========================================================
  // OTP COUNTDOWN
  // =========================================================

  useEffect(() => {
    if (!otpStep || otpTimeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [otpStep, otpTimeLeft]);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await loginUser(
        email.trim(),
        password
      );

      if (!data?.access_token) {
        throw new Error(
          "Backend did not return an access token."
        );
      }

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      localStorage.setItem(
        "token_type",
        data.token_type || "bearer"
      );

      setToken(data.access_token);
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err.response?.data?.detail ||
        err.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SEND OTP
  // =========================================================

  const handleSendOTP = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendRegistrationOTP(
        name.trim(),
        email.trim(),
        password
      );

      setOtp("");
      setOtpTimeLeft(60);
      setOtpStep(true);

      setMessage(
        `OTP sent successfully to ${email.trim()}`
      );
    } catch (err) {
      console.error("SEND OTP ERROR:", err);

      setError(
        err.response?.data?.detail ||
        err.message ||
        "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // REGISTER
  // =========================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    await handleSendOTP();
  };

  // =========================================================
  // VERIFY OTP
  // =========================================================

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (otpTimeLeft <= 0) {
      setError(
        "OTP expired. Please request a new OTP."
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "OTP must be exactly 6 digits."
      );
      return;
    }

    setLoading(true);

    try {
      await verifyRegistrationOTP(
        name,
        email,
        password,
        otp
      );

      setMessage(
        "Account created successfully. You can now login."
      );

      setName("");
      setEmail("");
      setPassword("");
      setOtp("");

      setTimeout(() => {
        setOtpStep(false);
        setIsRegistering(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      console.error(
        "OTP VERIFY ERROR:",
        err
      );

      setError(
        err.response?.data?.detail ||
        err.message ||
        "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RESEND OTP
  // =========================================================

  const handleResendOTP = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendRegistrationOTP(
        name.trim(),
        email.trim(),
        password
      );

      setOtp("");
      setOtpTimeLeft(60);

      setMessage(
        `A new OTP has been sent to ${email.trim()}`
      );
    } catch (err) {
      console.error(
        "RESEND OTP ERROR:",
        err
      );

      setError(
        err.response?.data?.detail ||
        err.message ||
        "Failed to resend OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SHOW REGISTER
  // =========================================================

  const showRegister = () => {
    setError("");
    setMessage("");

    setName("");
    setEmail("");
    setPassword("");
    setOtp("");

    setOtpStep(false);
    setIsRegistering(true);
  };

  // =========================================================
  // SHOW LOGIN
  // =========================================================

  const showLogin = () => {
    setError("");
    setMessage("");

    setName("");
    setEmail("");
    setPassword("");
    setOtp("");

    setOtpStep(false);
    setIsRegistering(false);
  };

  // =========================================================
  // BACK TO REGISTER FROM OTP
  // =========================================================

  const backToRegister = () => {
    setError("");
    setMessage("");
    setOtp("");

    setOtpStep(false);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");

    setToken(null);
  };

  // =========================================================
  // DASHBOARD
  // =========================================================

  if (token) {
    return (
      <Dashboard
        onLogout={logout}
      />
    );
  }

  // =========================================================
  // AUTH SCREEN
  // =========================================================

  return (
    <div className="app">

      <div className="login-card">

        {/* =================================================
            LOGO
        ================================================= */}

        <div className="logo">

          {otpStep ? (
            <ShieldCheck size={30} />
          ) : isRegistering ? (
            <UserPlus size={30} />
          ) : (
            <FileText size={30} />
          )}

        </div>

        {/* =================================================
            TITLE
        ================================================= */}

        <h1>
          {otpStep
            ? "Verify Email"
            : isRegistering
              ? "Create Account"
              : "Secure Access"}
        </h1>

        {/* =================================================
            SUBTITLE
        ================================================= */}

        <p className="subtitle">

          {otpStep
            ? `Enter the 6-digit OTP sent to ${email}`
            : isRegistering
              ? "Create your account to access the document management workspace."
              : "Real-Time Collaborative Document Management"}

        </p>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {message && (
          <p className="success">
            {message}
          </p>
        )}

        {/* =================================================
            OTP SCREEN
        ================================================= */}

        {otpStep ? (

          <form onSubmit={handleVerifyOTP}>

            <label>
              Verification Code
            </label>

            <div className="input-box">

              <ShieldCheck size={18} />

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => {
                  const value =
                    e.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setOtp(value);
                }}
                autoComplete="one-time-code"
                required
              />

            </div>

            {/* =================================================
                TIMER
            ================================================= */}

            <div className="otp-timer">

              {otpTimeLeft > 0 ? (

                <span>
                  OTP expires in{" "}
                  <strong>
                    {otpTimeLeft}s
                  </strong>
                </span>

              ) : (

                <span className="otp-expired">
                  OTP expired
                </span>

              )}

            </div>

            {/* =================================================
                VERIFY BUTTON
            ================================================= */}

            <button
              type="submit"
              disabled={
                loading ||
                otpTimeLeft <= 0
              }
            >

              {loading
                ? "Verifying..."
                : "Verify OTP"}

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

            {/* =================================================
                OTP ACTIONS
            ================================================= */}

            <div className="otp-actions">

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
              >

                <RefreshCw size={16} />

                Resend OTP

              </button>

              <button
                type="button"
                onClick={backToRegister}
              >
                Back
              </button>

            </div>

          </form>

        ) : isRegistering ? (

          /* =================================================
             REGISTER FORM
          ================================================= */

          <form onSubmit={handleRegister}>

            {/* NAME */}

            <label>
              Name
            </label>

            <div className="input-box">

              <User size={18} />

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                autoComplete="name"
                required
              />

            </div>

            {/* EMAIL */}

            <label>
              Email
            </label>

            <div className="input-box">

              <Mail size={18} />

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
                required
              />

            </div>

            {/* PASSWORD */}

            <label>
              Password
            </label>

            <div className="input-box">

              <Lock size={18} />

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />

            </div>

            {/* SEND OTP */}

            <button
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Sending OTP..."
                : "Send OTP"}

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

            {/* LOGIN LINK */}

            <div className="auth-switch">

              <span>
                Already have an account?
              </span>

              <button
                type="button"
                onClick={showLogin}
              >
                Back to Login
              </button>

            </div>

          </form>

        ) : (

          /* =================================================
             LOGIN FORM
          ================================================= */

          <form onSubmit={handleLogin}>

            {/* EMAIL */}

            <label>
              Email
            </label>

            <div className="input-box">

              <Mail size={18} />

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
                required
              />

            </div>

            {/* PASSWORD */}

            <label>
              Password
            </label>

            <div className="input-box">

              <Lock size={18} />

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
              />

            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Logging in..."
                : "Login"}

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

            {/* REGISTER LINK */}

            <div className="auth-switch">

              <span>
                Don't have an account?
              </span>

              <button
                type="button"
                onClick={showRegister}
              >
                Create Account
              </button>

            </div>

          </form>

        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <p className="footer">
          Enterprise Document Intelligence
        </p>

      </div>

    </div>
  );
}


export default App;