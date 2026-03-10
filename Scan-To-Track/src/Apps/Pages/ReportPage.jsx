import { FaSync, FaChartBar } from "react-icons/fa";

function ReportPage({ reportDate, setReportDate, reportList, reportLoading, totalStudents }) {
  const isWeekendDate = (dateStr) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
  };

  const lateCount = reportList.filter((r) => r.status === "Late").length;
  const onTimeCount = reportList.length - lateCount;
  const absentCount = isWeekendDate(reportDate) ? 0 : Math.max(0, totalStudents - reportList.length);

  const chartData = [
    {
      label: "On Time",
      value: onTimeCount,
      color: "bg-emerald-500",
      pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    {
      label: "Late",
      value: lateCount,
      color: "bg-amber-500",
      pill: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    {
      label: "Absent",
      value: absentCount,
      color: "bg-rose-500",
      pill: "bg-rose-50 text-rose-700 border border-rose-200",
    },
  ];

  const chartBase = Math.max(totalStudents, 1);

  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-700">Attendance Report</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-gray-500 font-medium">Date:</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8B1A1A] transition"
          />
        </div>
      </div>
      {reportLoading ? (
        <div className="flex justify-center py-12">
          <FaSync className="animate-spin text-[#8B1A1A]" size={28} />
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-5 flex-wrap">
            <span className="bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-emerald-200">
              On Time: {onTimeCount}
            </span>
            <span className="bg-amber-50 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-amber-200">
              Late: {lateCount}
            </span>
            <span className="bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-green-200">
              Present: {reportList.length}
            </span>
            <span className="bg-red-50 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-red-200">
              Absent: {absentCount}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-gray-700 flex items-center gap-2">
                <FaChartBar className="text-[#8B1A1A]" /> Daily Attendance Chart
              </h3>
              <span className="text-xs text-gray-500">Base: {totalStudents} students</span>
            </div>

            <div className="space-y-3">
              {chartData.map((item) => {
                const pct = Math.min(100, Math.round((item.value / chartBase) * 100));
                return (
                  <div key={item.label} className="grid grid-cols-[80px_1fr_auto] sm:grid-cols-[90px_1fr_auto] items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm font-semibold text-gray-600">{item.label}</span>
                    <div className="h-3.5 sm:h-4 rounded-full bg-white border border-slate-200 overflow-hidden">
                      <div className={`${item.color} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.pill}`}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {reportList.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-5 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <FaChartBar className="text-gray-300" size={26} />
              </div>
              <p className="text-gray-500 font-medium">No records for this date</p>
              <p className="text-gray-400 text-sm">Try selecting a different date.</p>
            </div>
          )}

          {reportList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-l-xl">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time In</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportList.map((r, i) => (
                  <tr key={r._id || i} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-sm">{r.lrn}</td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-sm">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{r.timeIn}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${r.status === "Late" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {r.status || "Present"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportPage;
