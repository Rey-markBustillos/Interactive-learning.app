import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaGraduationCap, FaCamera, FaUsers, FaChartBar, FaArrowRight, FaSearch, FaTimes, FaCheckCircle, FaClock, FaCalendarAlt, FaUserPlus, FaDownload } from "react-icons/fa";
import schoolBg from "/school-bg.jpg";

function LandingPage() {
  const navigate = useNavigate();
  const [showTracker, setShowTracker] = useState(false);
  const [lrn, setLrn] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setTrackError("");
    setTrackResult(null);
    if (!lrn.trim()) { setTrackError("Please enter your LRN."); return; }
    setTrackLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/public/track?lrn=${encodeURIComponent(lrn.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTrackResult(data);
    } catch (err) {
      setTrackError(err.message);
    } finally {
      setTrackLoading(false);
    }
  };

  const closeTracker = () => {
    setShowTracker(false);
    setLrn("");
    setTrackResult(null);
    setTrackError("");
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${schoolBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Lighter white overlay on top of the image (reduced to 15%) */}
      <div className="absolute inset-0 bg-white/15" />

      {/* All content above the overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#8B1A1A] p-2.5 rounded-xl">
            <FaGraduationCap size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Scan-to-Track</h1>
            <p className="text-red-200 text-xs">Attendance System</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-white hover:text-white hover:bg-white/20 border border-white/60 px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm bg-white text-[#8B1A1A] font-bold border border-[#8B1A1A] px-4 py-2 rounded-xl transition hover:bg-[#8B1A1A] hover:text-white hover:border-white cursor-pointer"
          >
            Register
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="bg-white/20 p-5 rounded-3xl mb-6 inline-block">
          <FaGraduationCap size={52} className="text-white" />
        </div>

        <h2 className="text-5xl font-extrabold text-white mb-4 leading-tight">
          Smart Attendance<br />
          <span className="text-red-200">Made Simple</span>
        </h2>

        <p className="text-white/80 text-lg max-w-md mb-10">
          Track student attendance instantly using School ID, LRN, or Name.
          Fast, accurate, and effortless.
        </p>

        {/* PWA Install Button */}
        {!isInstalled && installPrompt && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 bg-white text-[#8B1A1A] font-bold px-7 py-3 rounded-2xl text-base shadow-xl hover:bg-red-50 hover:scale-105 transition-all duration-200 cursor-pointer mb-3 border-2 border-[#8B1A1A]"
          >
            <FaDownload size={16} /> Install App
          </button>
        )}

        <button
          onClick={() => setShowTracker(true)}
          className="flex items-center gap-3 bg-white/20 border border-white/50 text-[#8B1A1A] font-bold px-7 py-3.5 rounded-2xl text-base shadow hover:bg-white/30 transition-all duration-200 cursor-pointer mb-4"
        >
          <FaSearch size={15} className="text-[#8B1A1A]" /> Track My Attendance
        </button>

        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-3 bg-white text-[#8B1A1A] font-bold px-8 py-4 rounded-2xl text-lg shadow-xl hover:bg-red-50 hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          Continue to Login <FaArrowRight />
        </button>

      </main>

      {/* Track Attendance Modal */}
      {showTracker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 relative">
            <button
              onClick={closeTracker}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <FaTimes size={18} />
            </button>

            <div className="flex justify-center mb-3">
              <div className="bg-red-100 p-3 rounded-2xl">
                <FaCalendarAlt size={26} className="text-[#8B1A1A]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-[#8B1A1A] mb-1">Track My Attendance</h2>
            <p className="text-center text-gray-400 text-sm mb-5">Enter your LRN to view your record</p>

            <form onSubmit={handleTrack} className="space-y-3">
              {trackError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl text-center">{trackError}</div>
              )}
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaSearch size={14} /></span>
                <input
                  type="text"
                  value={lrn}
                  onChange={(e) => setLrn(e.target.value)}
                  placeholder="Enter your LRN"
                  className="w-full pl-9 pr-4 py-3 border-2 border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={trackLoading}
                className="w-full bg-[#8B1A1A] text-white py-3 rounded-xl font-semibold hover:bg-[#6b1010] transition disabled:opacity-50 cursor-pointer text-sm"
              >
                {trackLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {trackResult && (
              <div className="mt-5 bg-red-50 rounded-2xl p-4">
                <p className="text-center font-bold text-[#8B1A1A] text-base mb-3">{trackResult.name}</p>
                <p className="text-center text-gray-400 text-xs mb-4">LRN: {trackResult.lrn}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-100 rounded-xl p-3 text-center">
                    <FaCheckCircle className="text-green-500 mx-auto mb-1" size={18} />
                    <p className="text-2xl font-bold text-green-700">{trackResult.present}</p>
                    <p className="text-xs text-green-600">Present</p>
                  </div>
                  <div className="bg-yellow-100 rounded-xl p-3 text-center">
                    <FaClock className="text-yellow-500 mx-auto mb-1" size={18} />
                    <p className="text-2xl font-bold text-yellow-700">{trackResult.late}</p>
                    <p className="text-xs text-yellow-600">Late</p>
                  </div>
                  <div className="bg-red-100 rounded-xl p-3 text-center">
                    <FaCalendarAlt className="text-[#8B1A1A] mx-auto mb-1" size={18} />
                    <p className="text-2xl font-bold text-[#8B1A1A]">{trackResult.total}</p>
                    <p className="text-xs text-red-700">Total Days</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-8 pb-16 max-w-3xl mx-auto w-full">
        {[
          { icon: FaCamera,   title: "Scan & Track",    desc: "Mark attendance using School ID, LRN, or student name" },
          { icon: FaUsers,    title: "Manage Students",  desc: "Add, archive, and organize your student roster"    },
          { icon: FaChartBar, title: "View Reports",     desc: "See attendance summaries and export records"        },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white/70 border border-red-100 rounded-2xl p-5 text-left shadow">
            <div className="bg-red-100 p-2.5 rounded-xl inline-block mb-3">
              <Icon size={18} className="text-[#8B1A1A]" />
            </div>
            <h3 className="text-[#8B1A1A] font-semibold text-sm mb-1">{title}</h3>
            <p className="text-gray-500 text-xs">{desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center pb-6 text-gray-500 text-xs">
        © 2026 Scan-to-Track · All rights reserved
      </footer>
      </div>
    </div>
  );
}

export default LandingPage;
