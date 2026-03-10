import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserAlt, FaEnvelope, FaLock, FaArrowLeft, FaUserShield, FaBook, FaTimes } from "react-icons/fa";
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
  const [subject, setSubject] = useState("");   // current input value
  const [subjects, setSubjects] = useState([]); // committed subjects array
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const addSubject = () => {
    const trimmed = subject.trim();
    if (!trimmed) return;
    if (subjects.includes(trimmed)) { setSubject(""); return; }
    setSubjects((prev) => [...prev, trimmed]);
    setSubject("");
  };

  const removeSubject = (i) => setSubjects((prev) => prev.filter((_, idx) => idx !== i));

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
    if (!subject.trim()) { setError("Subject is required."); return; }
    // Include any un-committed text still in the input box
    const finalSubjects = subjects.length > 0
      ? subjects
      : subject.trim() ? [subject.trim()] : [];
    if (finalSubjects.length === 0) { setError("At least one subject is required."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name, email, password, subjects: [subject.trim()] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`Account for "${data.name}" created successfully!`);
      setName("");
      setEmail("");
      setPassword("");
      setSubject("");
      setSubjects([]);
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

              {/* Subjects */}
              <div>
                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider block mb-2">Subjects</label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-white/60"><FaBook size={13} /></span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
                      placeholder="e.g. Mathematics"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addSubject}
                    className="px-4 py-2.5 rounded-xl bg-white/20 border border-white/25 text-white text-sm font-semibold hover:bg-white/30 transition cursor-pointer whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {subjects.map((sub, i) => (
                      <span key={i} className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/25">
                        {sub}
                        <button type="button" onClick={() => removeSubject(i)} className="text-white/60 hover:text-white cursor-pointer leading-none">
                          <FaTimes size={9} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
