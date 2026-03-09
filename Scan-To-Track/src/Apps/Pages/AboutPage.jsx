import { useState } from "react";
import { FaGraduationCap, FaSchool, FaUsers, FaCode, FaHeart, FaStar, FaCamera } from "react-icons/fa";

const members = [
  { name: "Rey-mark Bustillos", role: "Lead Developer",   photo: "/members/member.jpeg", color: "from-[#8B1A1A] to-[#4a0a0a]",   ring: "ring-red-400"   },
  { name: "Member Name 2",      role: "UI/UX Designer",    photo: "/members/member2.jpg", color: "from-purple-500 to-pink-500",  ring: "ring-purple-400" },
  { name: "Member Name 3",      role: "Backend Developer", photo: "/members/member3.jpg", color: "from-emerald-500 to-teal-600", ring: "ring-emerald-400" },
  { name: "Member Name 4",      role: "Quality Assurance", photo: "/members/member4.jpg", color: "from-orange-400 to-rose-500",  ring: "ring-orange-400" },
];

const techStack = [
  { label: "React 19", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Vite", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Tailwind CSS", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { label: "Node.js", color: "bg-green-50 text-green-700 border-green-200" },
  { label: "Express", color: "bg-gray-50 text-gray-700 border-gray-200" },
  { label: "MongoDB", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Tesseract.js", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { label: "JWT Auth", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { label: "SheetJS", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

function MemberCard({ member: m, isLead }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center text-center group">
      {/* Photo / Fallback avatar */}
      <div className={`relative w-20 h-20 rounded-full ring-4 ${m.ring} ring-offset-2 shadow-lg mb-3`}>
        {!imgError ? (
          <img
            src={m.photo}
            alt={m.name}
            onError={() => setImgError(true)}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className={`w-full h-full rounded-full bg-linear-to-br ${m.color} flex items-center justify-center text-white font-extrabold text-2xl shadow-inner`}>
            {m.name.charAt(0)}
          </div>
        )}
        {imgError && (
          <div className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1 shadow">
            <FaCamera size={9} className="text-gray-400" />
          </div>
        )}
        {isLead && (
          <div className="absolute -top-1 -right-1">
            <span className="flex items-center gap-0.5 bg-yellow-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
              <FaStar size={7} /> Lead
            </span>
          </div>
        )}
      </div>
      <p className="text-gray-800 font-bold text-sm leading-tight">{m.name}</p>
      <p className="text-gray-400 text-xs mt-0.5">{m.role}</p>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#8B1A1A] via-[#7B0000] to-[#4a0a0a] p-8 text-white shadow-2xl shadow-red-300">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute top-6 right-24 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="bg-white/15 backdrop-blur-sm border border-white/20 p-5 rounded-3xl w-fit shadow-lg">
            <FaGraduationCap size={44} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-extrabold tracking-tight">Scan-to-Track</h1>
              <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/20">v1.0.0</span>
            </div>
            <p className="text-red-200 text-base font-medium">Student Attendance System</p>
            <p className="text-red-100/80 text-sm mt-3 leading-relaxed max-w-md">
              A web-based attendance system that uses camera and OCR technology to quickly track student attendance using their LRN and name.
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          {["React + Node.js", "MongoDB Atlas", "Camera OCR", "CSV Import"].map((tag) => (
            <span key={tag} className="bg-white/10 border border-white/20 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* School Info - full width */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-linear-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-[#8B1A1A] text-white p-2 rounded-xl">
            <FaSchool size={15} />
          </div>
          <h2 className="text-base font-bold text-gray-800">School Information</h2>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { label: "School",      value: "Jose C. Payumo Memorial High School" },
            { label: "Section",     value: "Section Name Here" },
            { label: "School Year", value: "2025 - 2026" },
            { label: "Subject",     value: "Subject Name Here" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
              <span className="text-gray-800 font-semibold text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Group Members - photo card grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-linear-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#8B1A1A] text-white p-2 rounded-xl">
              <FaUsers size={15} />
            </div>
            <h2 className="text-base font-bold text-gray-800">Group Members</h2>
          </div>
          <span className="text-xs text-gray-400">Place photos in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">public/members/</code></span>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
          {members.map((m, i) => (
            <MemberCard key={i} member={m} isLead={i === 0} />
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-linear-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-green-600 text-white p-2 rounded-xl">
            <FaCode size={15} />
          </div>
          <h2 className="text-base font-bold text-gray-800">Built With</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2.5">
            {techStack.map(({ label, color }) => (
              <span key={label} className={`${color} border text-xs font-bold px-4 py-2 rounded-xl`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-2">
        <p className="text-gray-400 text-xs flex items-center justify-center gap-1.5">
          Made with <FaHeart className="text-red-400 animate-pulse" size={11} /> for our school project - 2025-2026
        </p>
      </div>

    </div>
  );
}

export default AboutPage;
