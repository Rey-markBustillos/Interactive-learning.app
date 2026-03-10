import { FaCamera, FaUserCheck, FaUserTimes, FaUsers, FaSync, FaStop, FaSyncAlt, FaBook } from "react-icons/fa";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function getDayName(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function AttendancePage({
  totalStudents, absentCount,
  scanning, processing, message, messageType,
  videoRef, canvasRef,
  startCamera, stopCamera, captureAndScan,
  switchCamera, facingMode,
  attendanceList,
  subjects, selectedSubject, setSelectedSubject,
}) {
  // Filter attendance list to the selected subject
  const subjectList = selectedSubject
    ? attendanceList.filter((a) => (a.subject || "") === selectedSubject)
    : attendanceList;
  const subjectPresent = subjectList.length;
  return (
    <div className="space-y-6">
      {/* Subject Selector */}
      {subjects && subjects.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 shrink-0">
              <FaBook className="text-[#8B1A1A]" size={13} /> Subject:
            </span>
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  selectedSubject === sub
                    ? "bg-[#8B1A1A] text-white shadow-md shadow-red-200"
                    : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-[#8B1A1A]"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
          {selectedSubject && (
            <p className="text-xs text-gray-400 mt-2">
              Scanning attendance for <strong className="text-[#8B1A1A]">{selectedSubject}</strong>
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-linear-to-br from-[#8B1A1A] to-[#4a0a0a] rounded-2xl shadow-lg shadow-red-200 p-6 flex items-center gap-4">
          <div className="bg-white/20 text-white p-3.5 rounded-2xl shrink-0"><FaUsers size={24} /></div>
          <div>
            <p className="text-xs text-red-100 font-medium uppercase tracking-wide">Total Students</p>
            <p className="text-3xl font-bold text-white mt-0.5">{totalStudents}</p>
          </div>
        </div>
        <div className="bg-linear-to-br from-emerald-400 to-green-600 rounded-2xl shadow-lg shadow-green-200 p-6 flex items-center gap-4">
          <div className="bg-white/20 text-white p-3.5 rounded-2xl shrink-0"><FaUserCheck size={24} /></div>
          <div>
            <p className="text-xs text-emerald-100 font-medium uppercase tracking-wide">Present{selectedSubject ? ` (${selectedSubject})` : ""}</p>
            <p className="text-3xl font-bold text-white mt-0.5">{subjectPresent}</p>
          </div>
        </div>
        <div className="bg-linear-to-br from-red-400 to-rose-600 rounded-2xl shadow-lg shadow-red-200 p-6 flex items-center gap-4">
          <div className="bg-white/20 text-white p-3.5 rounded-2xl shrink-0"><FaUserTimes size={24} /></div>
          <div>
            <p className="text-xs text-red-100 font-medium uppercase tracking-wide">Absent</p>
            <p className="text-3xl font-bold text-white mt-0.5">{absentCount}</p>
          </div>
        </div>
      </div>

      {/* Scanner */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FaCamera className="text-[#8B1A1A]" /> Scan LRN &amp; Name
        </h2>
        {!scanning && (
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100">
              <FaCamera className="text-[#8B1A1A]" size={38} />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-semibold text-base">Camera is ready</p>
              <p className="text-gray-400 text-sm mt-1">Press the button below to scan a student&apos;s LRN or name</p>
            </div>
            <button onClick={startCamera} className="flex items-center gap-2 bg-[#8B1A1A] hover:bg-[#6b1010] text-white px-10 py-3 rounded-xl font-semibold transition cursor-pointer shadow-lg shadow-red-200">
              <FaCamera /> Open Camera
            </button>
          </div>
        )}
        {scanning && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden bg-black shadow-lg" style={{ aspectRatio: "4/3" }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-[6%] bg-black/40" />
                <div className="absolute bottom-0 left-0 right-0 h-[6%] bg-black/40" />
                <div className="absolute top-[6%] bottom-[6%] left-0 w-[3%] bg-black/40" />
                <div className="absolute top-[6%] bottom-[6%] right-0 w-[3%] bg-black/40" />
                <div className="absolute border-2 border-white rounded-lg" style={{ top: "6%", bottom: "6%", left: "3%", right: "3%" }}>
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-[#8B1A1A] rounded-tl-md" />
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-[#8B1A1A] rounded-tr-md" />
                  <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-[#8B1A1A] rounded-bl-md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-[#8B1A1A] rounded-br-md" />
                  {processing && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                      <div className="absolute left-0 right-0 h-0.5 bg-[#8B1A1A]/80" style={{ animation: "scanLine 1.5s ease-in-out infinite" }} />
                    </div>
                  )}
                </div>
                <span className="absolute text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-full" style={{ bottom: "calc(6% + 6px)", left: "50%", transform: "translateX(-50%)" }}>
                  {processing ? "Reading..." : "Align the card so the LRN and name are visible"}
                </span>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3 w-full justify-center flex-wrap">
              <button onClick={captureAndScan} disabled={processing} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-8 py-3 rounded-xl font-semibold transition cursor-pointer shadow">
                {processing ? <><FaSync className="animate-spin" /> Reading...</> : <><FaCamera /> Capture &amp; Scan</>}
              </button>
              <button onClick={switchCamera} disabled={processing} className="flex items-center gap-2 bg-[#8B1A1A] hover:bg-[#6b1010] disabled:bg-red-300 text-white px-5 py-3 rounded-xl font-semibold transition cursor-pointer shadow" title="Switch camera">
                <FaSyncAlt /> {facingMode === "environment" ? "Front Cam" : "Back Cam"}
              </button>
              <button onClick={stopCamera} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition cursor-pointer shadow">
                <FaStop /> Stop
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">Tip: Hold the full ID card flat inside the frame, ensure good lighting, and keep it steady.</p>
          </div>
        )}
        {message && (
          <div className={"mt-4 w-full text-center px-4 py-3 rounded-xl font-medium " + (messageType === "success" ? "bg-green-100 text-green-700" : messageType === "warning" ? "bg-yellow-100 text-yellow-700" : messageType === "error" ? "bg-red-100 text-red-700" : "bg-red-50 text-[#8B1A1A]")}>
            {message}
          </div>
        )}
      </div>

      {/* Today's Attendance Table */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Today&apos;s Attendance{selectedSubject ? ` — ${selectedSubject}` : ""}
        </h2>
        {subjectList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <FaUserCheck className="text-gray-300" size={28} />
            </div>
            <p className="text-gray-500 font-medium">No students scanned yet</p>
            <p className="text-gray-400 text-sm">Open the camera and scan so the LRN and name are visible.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-96">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 rounded-xl">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-l-xl">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Day</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time In</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody>
                {subjectList.map((s, i) => {
                  // Determine if late: status === 'Late' or timeIn after 7:40am
                  let isLate = s.status === 'Late';
                  if (!s.status && s.timeIn) {
                    const m = s.timeIn.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
                    if (m) {
                      let h = parseInt(m[1], 10);
                      const min = parseInt(m[2], 10);
                      const ap = m[3]?.toUpperCase();
                      if (ap === 'PM' && h !== 12) h += 12;
                      if (ap === 'AM' && h === 12) h = 0;
                      isLate = h > 7 || (h === 7 && min > 40);
                    }
                  }
                  return (
                    <tr key={s._id || i} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-sm">{s.lrn}</td>
                      <td className="px-4 py-3 text-gray-800 font-semibold text-sm">{s.name}</td>
                      <td className="px-4 py-3">
                        {s.section ? (
                          <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full">{s.section}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{getDayName(s.date)}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm font-mono">{s.date}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{s.timeIn}</td>
                      <td className="px-4 py-3">
                        {isLate ? (
                          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">Late</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Present</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendancePage;
