import { useState } from "react";
import Swal from 'sweetalert2';
import { FaUsers, FaTrash, FaArchive, FaCheckSquare, FaCheckCircle, FaTimesCircle, FaBoxOpen, FaArrowLeft, FaUndo, FaClock } from "react-icons/fa";

function ListStudentsPage({ studentList, archivedStudents = [], allAttendance = [], handleBulkDelete, handleArchiveStudents, handleRetrieveStudent }) {
  const [view, setView] = useState("active"); // "active" | "archived"

  // Helper: returns true if a timeIn string (locale format) is after 7:40 AM
  const checkLate = (timeIn) => {
    if (!timeIn) return false;
    const m = timeIn.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
    if (!m) return false;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3]?.toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h > 7 || (h === 7 && min > 40);
  };

  // Compute per-student on-time / late counts and total unique school days
  const totalDays = new Set(allAttendance.map((a) => a.date)).size;
  const presentMap = {}; // on-time scans per lrn
  const lateMap = {};    // late scans per lrn
  allAttendance.forEach((a) => {
    const late = a.status === "Late" || checkLate(a.timeIn);
    if (late) {
      lateMap[a.lrn] = (lateMap[a.lrn] || 0) + 1;
    } else {
      presentMap[a.lrn] = (presentMap[a.lrn] || 0) + 1;
    }
  });;
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === studentList.filter((s) => s._id).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(studentList.filter((s) => s._id).map((s) => s._id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const onDelete = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${selectedIds.size} student(s)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, delete',
    }).then((result) => {
      if (result.isConfirmed) {
        handleBulkDelete([...selectedIds]);
        exitSelectMode();
      }
    });
  };

  const onArchive = () => {
    Swal.fire({
      title: 'Archive students?',
      text: `Archive ${selectedIds.size} student(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e42',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, archive',
    }).then((result) => {
      if (result.isConfirmed) {
        handleArchiveStudents([...selectedIds]);
        exitSelectMode();
      }
    });
  };

  const allSelected =
    studentList.filter((s) => s._id).length > 0 &&
    selectedIds.size === studentList.filter((s) => s._id).length;

  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
      {/* ── Inner Navbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
          {view === "archived" ? (
            <><FaBoxOpen className="text-amber-500" /> Archived Students</>
          ) : (
            <><FaUsers className="text-[#8B1A1A]" /> All Students</>
          )}
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {view === "archived" ? (
            <button
              onClick={() => setView("active")}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all cursor-pointer"
            >
              <FaArrowLeft size={11} /> Back to Active
            </button>
          ) : !selectMode ? (
            <>
              <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                {studentList.length} students
              </span>
              {archivedStudents.length > 0 && (
                <button
                  onClick={() => setView("archived")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                >
                  <FaBoxOpen size={12} /> Archived
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {archivedStudents.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#8B1A1A] text-white shadow-sm hover:bg-[#6b1010] active:scale-95 transition-all cursor-pointer"
              >
                <FaCheckSquare size={12} /> Select Students
              </button>
            </>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <span className="text-xs font-semibold bg-red-100 text-red-800 px-3 py-1 rounded-full">
                  {selectedIds.size} selected
                </span>
              )}
              <button
                onClick={onArchive}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <FaArchive size={12} /> Archive
              </button>
              <button
                onClick={onDelete}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <FaTrash size={12} /> Delete
              </button>
              <button
                onClick={exitSelectMode}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Archived View ── */}
      {view === "archived" ? (
        archivedStudents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
              <FaBoxOpen className="text-amber-300" size={28} />
            </div>
            <p className="text-gray-500 font-medium">No archived students</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-amber-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-l-xl">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody>
                {archivedStudents.map((s, i) => (
                  <tr key={s._id || s.lrn} className="border-b border-gray-100 hover:bg-amber-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-sm">{s.lrn}</td>
                    <td className="px-4 py-3 text-gray-800 font-semibold text-sm">{s.name}</td>
                    <td className="px-4 py-3">
                      {s.section ? (
                        <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full">{s.section}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s._id && (
                        <button
                          onClick={() => handleRetrieveStudent(s._id)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white active:scale-95 transition-all cursor-pointer"
                          title="Retrieve student"
                        >
                          <FaUndo size={11} /> Retrieve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : studentList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <FaUsers className="text-gray-300" size={28} />
          </div>
          <p className="text-gray-500 font-medium">No students yet</p>
          <p className="text-gray-400 text-sm">Go to Add Student to register the first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                {selectMode && (
                  <th className="px-4 py-3 rounded-l-xl">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-red-800 cursor-pointer"
                    />
                  </th>
                )}
                <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${!selectMode ? "rounded-l-xl" : ""}`}>#</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">LRN</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                <th className="px-4 py-3 text-xs font-semibold text-green-600 uppercase text-center">Present</th>
                <th className="px-4 py-3 text-xs font-semibold text-amber-500 uppercase text-center">Late</th>
                <th className={`px-4 py-3 text-xs font-semibold text-red-400 uppercase text-center ${!selectMode ? "rounded-r-xl" : ""}`}>Absent</th>
              </tr>
            </thead>
            <tbody>
              {studentList.map((s, i) => (
                <tr
                  key={s._id || s.lrn}
                  className={`border-b border-gray-100 transition-colors ${
                    selectMode && selectedIds.has(s._id)
                      ? "bg-red-50"
                      : "hover:bg-red-50/50"
                  } ${selectMode && s._id ? "cursor-pointer" : ""}`}
                  onClick={selectMode && s._id ? () => toggleSelect(s._id) : undefined}
                >
                  {selectMode && (
                    <td className="px-4 py-3">
                      {s._id && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s._id)}
                          onChange={() => toggleSelect(s._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-red-800 cursor-pointer"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-sm">{s.lrn}</td>
                  <td className="px-4 py-3 text-gray-800 font-semibold text-sm">{s.name}</td>
                  <td className="px-4 py-3">
                    {s.section ? (
                      <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full">{s.section}</span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full">
                      <FaCheckCircle size={11} /> {presentMap[s.lrn] || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-500 text-xs font-bold px-2.5 py-1 rounded-full">
                      <FaClock size={11} /> {lateMap[s.lrn] || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
                      <FaTimesCircle size={11} /> {totalDays - (presentMap[s.lrn] || 0) - (lateMap[s.lrn] || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ListStudentsPage;
