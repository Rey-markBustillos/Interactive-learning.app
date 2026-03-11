import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserAlt, FaEnvelope, FaLock, FaArrowLeft, FaUserShield } from "react-icons/fa";
import schoolBg from "/school-bg.jpg";

function Register() {
  const navigate = useNavigate();

  // Step 1: admin auth state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  // Step 2: new user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already logged in as admin
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (token && user.role === "admin") {
      setAdminToken(token);
      setIsAdmin(true);
    }
  }, []);

  // Step 1: verify admin credentials
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    if (!adminEmail.trim()) { setAdminError("Email is required."); return; }
    if (!adminPassword.trim()) { setAdminError("Password is required."); return; }
    setAdminLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid credentials.");
      if (data.role !== "admin") throw new Error("This account is not an admin.");
      setAdminToken(data.token);
      setIsAdmin(true);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  // Step 2: create new user
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim()) { setError("Name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`Account for "${data.name}" created successfully!`);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${schoolBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/55" />

      <div
        className="relative z-10 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 w-full max-w-xs sm:max-w-md mx-4"
        style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(18px)" }}
      >
        <div className="flex justify-center mb-4">
          <div className="bg-white/20 p-2 rounded-2xl">
            <img src="/app-logo.png" alt="Scan-to-Track logo" className="w-10 h-10 rounded-xl object-cover" />
          </div>
        </div>

        {!isAdmin ? (
          /* ── Step 1: Admin Login ── */
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-full">
                <FaUserShield size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-center text-white mb-1">Admin Verification</h1>
            <p className="text-center text-white/70 text-sm mb-6">Enter admin credentials to continue</p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              {adminError && (
                <div className="bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-xl text-sm text-center">
                  {adminError}
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3 top-3 text-white/60"><FaEnvelope /></span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Admin email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-3 text-white/60"><FaLock /></span>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Admin password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full bg-[#8B1A1A] text-white py-3 rounded-xl font-semibold hover:bg-[#6b1010] transition disabled:opacity-50 cursor-pointer"
              >
                {adminLoading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>
          </>
        ) : (
          /* ── Step 2: Create New User ── */
          <>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition mb-6 cursor-pointer"
            >
              <FaArrowLeft size={12} /> Back to Dashboard
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white mb-2">Create Account</h1>
            <p className="text-center text-white/70 text-sm mb-8">Admin only — add a new user</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-xl text-sm text-center">{error}</div>
              )}
              {success && (
                <div className="bg-green-500/20 border border-green-400/40 text-green-100 px-4 py-3 rounded-xl text-sm text-center">{success}</div>
              )}

              <div className="relative">
                <span className="absolute left-3 top-3 text-white/60"><FaUserAlt /></span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                  required
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-3 text-white/60"><FaEnvelope /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                  required
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-3 text-white/60"><FaLock /></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8B1A1A] text-white py-3 rounded-xl font-semibold hover:bg-[#6b1010] transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
