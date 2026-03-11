import { FaCamera, FaUserPlus, FaUsers, FaChartBar, FaBars, FaTimes, FaInfoCircle, FaClipboardList, FaUserShield } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const navItems = [
  { key: "attendance",    label: "Attendance Today", icon: FaCamera,        desc: "Scan & track" },
  { key: "add-student",   label: "Add Student",      icon: FaUserPlus,      desc: "Register new" },
  { key: "tracking",      label: "Tracking & Sections", icon: FaClipboardList, desc: "Sections & records" },
  { key: "list-students", label: "List Students",    icon: FaUsers,         desc: "View all" },
  { key: "report",        label: "Report",           icon: FaChartBar,      desc: "View by date" },
  { key: "about",         label: "About",            icon: FaInfoCircle,    desc: "About this app" },
];

function SideNav({ active, onNavigate }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleNav = (key) => {
    onNavigate(key);
    setOpen(false);
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-[#8B1A1A] text-white p-2.5 rounded-xl shadow-lg"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <FaTimes size={16} /> : <FaBars size={16} />}
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 flex flex-col z-40
          bg-linear-to-b from-[#8B1A1A] via-[#7B0000] to-[#4a0a0a]
          shadow-2xl transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:flex
        `}
      >
        {/* Brand */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 p-1.5 rounded-xl">
              <img src="/app-logo.png" alt="Scan-to-Track logo" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Scan-to-Track</h1>
              <p className="text-red-300 text-xs">Attendance System</p>
            </div>
          </div>
        </div>

        {/* User info */}
        {user.name && (
          <div className="mx-4 mb-4 px-4 py-3 bg-white/10 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8B1A1A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                <p className="text-red-300 text-xs truncate">{user.email}</p>
                {user.section && (
                  <p className="text-red-200 text-xs truncate mt-0.5">Section: {user.section}</p>
                )}
                {user.subjects && user.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user.subjects.map((sub) => (
                      <span key={sub} className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full leading-tight">{sub}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-4 mb-3 border-t border-white/10" />

        {/* Nav label */}
        <p className="px-6 text-red-300 text-xs font-semibold uppercase tracking-widest mb-2">Menu</p>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer group
                ${
                  active === item.key
                    ? "bg-white text-[#8B1A1A] shadow-lg shadow-red-900/30"
                    : "text-red-100 hover:bg-white/10 hover:text-white"
                }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                active === item.key ? "bg-red-100 text-[#8B1A1A]" : "bg-white/10 text-red-200 group-hover:bg-white/20"
              }`}>
                <item.icon size={14} />
              </div>
              <div className="text-left">
                <p className="leading-tight">{item.label}</p>
                <p className={`text-xs mt-0.5 ${
                  active === item.key ? "text-red-400" : "text-red-400 group-hover:text-red-300"
                }`}>{item.desc}</p>
              </div>
              {active === item.key && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-5 mt-4 space-y-3">
          {/* Admin: Register User button */}
          {user.role === "admin" && (
            <button
              onClick={() => { navigate("/register"); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-red-100 hover:bg-white/20 transition cursor-pointer text-sm font-semibold"
            >
              <FaUserShield size={14} className="text-red-300" />
              Register New User
            </button>
          )}
          <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 text-center">
            <img src="/app-logo.png" alt="Scan-to-Track logo" className="w-8 h-8 rounded-lg object-cover mx-auto mb-1.5" />
            <p className="text-red-200 text-xs">Scan-To-Track</p>
            <p className="text-red-400 text-xs mt-0.5">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default SideNav;
