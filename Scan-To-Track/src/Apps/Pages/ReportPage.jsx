import { FaSync, FaChartBar } from "react-icons/fa";

function ReportPage({ reportDate, setReportDate, reportList, reportLoading, totalStudents }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-700">Attendance Report</h2>
        <div className="flex items-center gap-2">
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
      ) : reportList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <FaChartBar className="text-gray-300" size={26} />
          </div>
          <p className="text-gray-500 font-medium">No records for this date</p>
          <p className="text-gray-400 text-sm">Try selecting a different date.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-5">
            <span className="bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-green-200">
              Present: {reportList.length}
            </span>
            <span className="bg-red-50 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-red-200">
              Absent: {totalStudents - reportList.length}
            </span>
          </div>
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
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportPage;
