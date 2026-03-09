import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaGraduationCap } from "react-icons/fa";
import schoolBg from "/school-bg.jpg";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      navigate("/dashboard");
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
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="rounded-3xl p-8 shadow-2xl border border-white/20"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(18px)" }}
        >
          {/* School branding */}
          <div className="flex flex-col items-center mb-7">
            <div className="bg-white/20 p-3 rounded-2xl mb-3">
              <FaGraduationCap size={32} className="text-white" />
            </div>
            <h2 className="text-white font-extrabold text-lg text-center leading-tight">
              Jose C. Payumo Jr.<br />Memorial High School
            </h2>
            <p className="text-white/60 text-xs mt-1">Attendance Tracking System</p>
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-6">Welcome Back!</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div className="relative">
              <span className="absolute left-3 top-3.5 text-white/50">
                <FaEnvelope size={15} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition text-sm"
                required
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-3.5 text-white/50">
                <FaLock size={15} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8B1A1A] hover:bg-[#a52020] text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
