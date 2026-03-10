import { useState, useEffect, useCallback } from "react";
import XLSXStyle from "xlsx-js-style";
import {
  FaSearch, FaCalendarAlt, FaClipboardList, FaClock,
  FaTimes, FaFileExcel, FaBook, FaUserCheck,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getDayName(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAYS[new Date(y, m - 1, d).getDay()];
}

function getWeekdays(year, month) {
  const days = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TrackingPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Current user
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userSubjects = currentUser.subjects || [];
  const [selectedSubject, setSelectedSubject] = useState(""); // "" = All

  // Export state
  const today = new Date();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(today.getMonth() + 1);
  const [exportYear, setExportYear] = useState(today.getFullYear());
  const [exportLoading, setExportLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "J. Payumo Jr. Memorial High School",
    schoolId: "30070",
    schoolYear: "2025-2026",
    gradeLevel: "12",
    section: "STEM 202",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterDate) params.set("date", filterDate);
      const res = await fetch(`${API}/attendance/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
      }
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleExportSF2 = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const monthStr = `${exportYear}-${String(exportMonth).padStart(2, "0")}`;

      const [studRes, attRes] = await Promise.all([
        fetch(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/attendance/all?month=${monthStr}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const students = await studRes.json();
      const attendance = await attRes.json();

      const weekdays = getWeekdays(exportYear, exportMonth);
      const monthName = MONTH_NAMES[exportMonth - 1];
      const totalCols = 2 + weekdays.length + 2; // #, Name, days, ABSENT, TARDY

      // presence map: lrn → Set of date strings they were scanned
      const presenceMap = {};
      attendance.forEach((r) => {
        if (!presenceMap[r.lrn]) presenceMap[r.lrn] = new Set();
        presenceMap[r.lrn].add(r.date);
      });

      // ── Style helpers ──────────────────────────────────────────────
      const border = {
        top:    { style: "thin", color: { rgb: "B0BEC5" } },
        bottom: { style: "thin", color: { rgb: "B0BEC5" } },
        left:   { style: "thin", color: { rgb: "B0BEC5" } },
        right:  { style: "thin", color: { rgb: "B0BEC5" } },
      };
      const borderMed = {
        top:    { style: "medium", color: { rgb: "1565C0" } },
        bottom: { style: "medium", color: { rgb: "1565C0" } },
        left:   { style: "medium", color: { rgb: "1565C0" } },
        right:  { style: "medium", color: { rgb: "1565C0" } },
      };

      const s = {
        title: {
          font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1565C0" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: borderMed,
        },
        subtitle: {
          font: { italic: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1976D2" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        infoLabel: {
          font: { bold: true, sz: 9, color: { rgb: "1565C0" } },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "right", vertical: "center" },
          border,
        },
        infoValue: {
          font: { sz: 9, color: { rgb: "1A237E" } },
          fill: { fgColor: { rgb: "FFFFFF" } },
          alignment: { horizontal: "left", vertical: "center" },
          border: { bottom: { style: "medium", color: { rgb: "1565C0" } } },
        },
        colHeaderDate: {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1565C0" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        colHeaderDay: {
          font: { bold: true, sz: 8, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1976D2" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        colHeaderName: {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1565C0" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border,
        },
        colHeaderSummary: {
          font: { bold: true, sz: 8, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "0D47A1" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border,
        },
        nameOdd: {
          font: { sz: 9 },
          fill: { fgColor: { rgb: "FFFFFF" } },
          alignment: { horizontal: "left", vertical: "center" },
          border,
        },
        nameEven: {
          font: { sz: 9 },
          fill: { fgColor: { rgb: "E8F5E9" } },
          alignment: { horizontal: "left", vertical: "center" },
          border,
        },
        numOdd: {
          font: { sz: 9 },
          fill: { fgColor: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        numEven: {
          font: { sz: 9 },
          fill: { fgColor: { rgb: "E8F5E9" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        present: {
          font: { bold: true, sz: 9, color: { rgb: "1565C0" } },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        presentEven: {
          font: { bold: true, sz: 9, color: { rgb: "1565C0" } },
          fill: { fgColor: { rgb: "BBDEFB" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        blankOdd: {
          fill: { fgColor: { rgb: "FAFAFA" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        blankEven: {
          fill: { fgColor: { rgb: "F1F8E9" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        totalRow: {
          font: { bold: true, sz: 9, color: { rgb: "1A237E" } },
          fill: { fgColor: { rgb: "FFF9C4" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        totalLabel: {
          font: { bold: true, sz: 9, color: { rgb: "1A237E" } },
          fill: { fgColor: { rgb: "FFF9C4" } },
          alignment: { horizontal: "left", vertical: "center" },
          border,
        },
        blankFill: {
          fill: { fgColor: { rgb: "F5F5F5" } },
          border,
        },
      };

      const cell = (v, style) => ({ v, s: style, t: typeof v === "number" ? "n" : "s" });

      // ── Build worksheet manually (row by row) ──────────────────────
      const ws = {};
      let R = 0; // 0-indexed row

      const setCell = (r, c, v, style) => {
        ws[XLSXStyle.utils.encode_cell({ r, c })] = cell(v, style);
      };
      const setBlankCell = (r, c, style) => {
        ws[XLSXStyle.utils.encode_cell({ r, c })] = { v: "", s: style, t: "s" };
      };

      // Row 0 — Title
      setCell(R, 0, "School Form 2 (SF2) Daily Attendance Report of Learners", s.title);
      for (let c = 1; c < totalCols; c++) setBlankCell(R, c, s.title);
      R++;

      // Row 1 — Subtitle
      setCell(R, 0, "(This replaced Form 1, Form 2 & STS Form 4 – Absenteeism and Dropout Profile)", s.subtitle);
      for (let c = 1; c < totalCols; c++) setBlankCell(R, c, s.subtitle);
      R++;

      // Row 2 — School ID / School Year / Month
      const infoRow2 = [
        ["School ID", s.infoLabel], [schoolInfo.schoolId, s.infoValue], ["", s.blankFill], ["", s.blankFill],
        ["School Year", s.infoLabel], [schoolInfo.schoolYear, s.infoValue], ["", s.blankFill], ["", s.blankFill],
        ["Report for the Month of:", s.infoLabel], [monthName.toUpperCase(), { ...s.infoValue, font: { bold: true, sz: 10, color: { rgb: "1565C0" } } }],
      ];
      infoRow2.forEach(([v, st], c) => setCell(R, c, v, st));
      for (let c = infoRow2.length; c < totalCols; c++) setBlankCell(R, c, s.blankFill);
      R++;

      // Row 3 — School Name / Grade / Section
      const infoRow3 = [
        ["Name of School:", s.infoLabel], [schoolInfo.schoolName, s.infoValue], ["", s.blankFill], ["", s.blankFill], ["", s.blankFill], ["", s.blankFill],
        ["Grade Level:", s.infoLabel], [schoolInfo.gradeLevel, s.infoValue],
        ["Section:", s.infoLabel], [schoolInfo.section, s.infoValue],
      ];
      infoRow3.forEach(([v, st], c) => setCell(R, c, v, st));
      for (let c = infoRow3.length; c < totalCols; c++) setBlankCell(R, c, s.blankFill);
      R++;

      // Row 4 — Date number header
      setCell(R, 0, "#", s.colHeaderDate);
      setCell(R, 1, "LEARNER'S NAME (Last Name, First Name, Middle Name)", s.colHeaderName);
      weekdays.forEach((d, i) => setCell(R, 2 + i, d.getDate(), s.colHeaderDate));
      setCell(R, 2 + weekdays.length,     "ABSENT", s.colHeaderSummary);
      setCell(R, 2 + weekdays.length + 1, "TARDY",  s.colHeaderSummary);
      R++;

      // Row 5 — Day abbreviation header
      setBlankCell(R, 0, s.colHeaderDay);
      setCell(R, 1, "(1st row for date, 2nd row for Day: M,T,W,TH,F)", s.colHeaderDay);
      weekdays.forEach((d, i) => setCell(R, 2 + i, DAYS_SHORT[d.getDay()], s.colHeaderDay));
      setBlankCell(R, 2 + weekdays.length,     s.colHeaderDay);
      setBlankCell(R, 2 + weekdays.length + 1, s.colHeaderDay);
      R++;

      // Student rows — "/" = present (scanned), blank = no record
      const presentCounts = new Array(weekdays.length).fill(0);
      students.forEach((stu, i) => {
        const isEven = i % 2 === 1;
        const nStyle  = isEven ? s.nameEven  : s.nameOdd;
        const numStyle = isEven ? s.numEven  : s.numOdd;
        const pStyle  = isEven ? s.presentEven : s.present;
        const bStyle  = isEven ? s.blankEven : s.blankOdd;

        setCell(R, 0, i + 1, numStyle);
        setCell(R, 1, stu.name, nStyle);

        const presentSet = presenceMap[stu.lrn] || new Set();
        let presentTotal = 0;

        weekdays.forEach((d, wi) => {
          const ds = fmtDate(d);
          if (presentSet.has(ds)) {
            setCell(R, 2 + wi, "/", pStyle);
            presentTotal++;
            presentCounts[wi]++;
          } else {
            setBlankCell(R, 2 + wi, bStyle);
          }
        });

        setCell(R, 2 + weekdays.length,     presentTotal, numStyle);
        setCell(R, 2 + weekdays.length + 1, 0,            numStyle);
        R++;
      });

      // Total present per day row
      setBlankCell(R, 0, s.totalRow);
      setCell(R, 1, "TOTAL PRESENT PER DAY", s.totalLabel);
      presentCounts.forEach((count, i) => setCell(R, 2 + i, count, s.totalRow));
      setCell(R, 2 + weekdays.length,     presentCounts.reduce((a, b) => a + b, 0), s.totalRow);
      setCell(R, 2 + weekdays.length + 1, 0, s.totalRow);
      R++;

      // Set worksheet range
      ws["!ref"] = `A1:${XLSXStyle.utils.encode_cell({ r: R - 1, c: totalCols - 1 })}`;

      // Column widths
      ws["!cols"] = [
        { wch: 4 },
        { wch: 40 },
        ...weekdays.map(() => ({ wch: 5 })),
        { wch: 9 },
        { wch: 7 },
      ];

      // Row heights
      ws["!rows"] = [
        { hpt: 28 }, // title
        { hpt: 16 }, // subtitle
        { hpt: 18 }, // school info
        { hpt: 18 },
        { hpt: 22 }, // date header
        { hpt: 18 }, // day header
        ...students.map(() => ({ hpt: 16 })),
        { hpt: 18 }, // total row
      ];

      // Merges
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // title
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // subtitle
        { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },  // school ID value span
        { s: { r: 2, c: 5 }, e: { r: 2, c: 7 } },  // school year value span
        { s: { r: 3, c: 1 }, e: { r: 3, c: 5 } },  // school name value span
        { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },  // # merge rows
        { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },  // name merge rows
        { s: { r: 4, c: totalCols - 2 }, e: { r: 5, c: totalCols - 2 } }, // ABSENT
        { s: { r: 4, c: totalCols - 1 }, e: { r: 5, c: totalCols - 1 } }, // TARDY
      ];

      // Freeze pane below header rows, after name col
      ws["!freeze"] = { xSplit: 2, ySplit: 6 };

      const wb = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(wb, ws, monthName);
      XLSXStyle.writeFile(wb, `SF2_${monthStr}_${schoolInfo.section.replace(/\s+/g, "_")}.xlsx`);
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      alert("Export failed. Make sure the backend is running.");
    } finally {
      setExportLoading(false);
    }
  };

  // Group records by date (filtered by selected subject)
  const filteredRecords = selectedSubject
    ? records.filter((r) => (r.subject || "") === selectedSubject)
    : records;

  const grouped = filteredRecords.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Per-subject present counts across all fetched records
  const subjectCounts = userSubjects.map((sub) => ({
    subject: sub,
    count: records.filter((r) => (r.subject || "") === sub).length,
  }));

  const statusBadge = (status) =>
    status === "Late"
      ? "bg-orange-50 text-orange-600 border border-orange-200"
      : "bg-green-50 text-green-600 border border-green-200";

  return (
    <div className="space-y-5">

      {/* Per-subject summary cards */}
      {subjectCounts.length > 0 && (
        <div className={`grid gap-4 ${subjectCounts.length === 1 ? "grid-cols-1 max-w-xs" : subjectCounts.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {subjectCounts.map(({ subject, count }) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(selectedSubject === subject ? "" : subject)}
              className={`rounded-2xl p-5 flex items-center gap-4 shadow text-left transition cursor-pointer ${
                selectedSubject === subject
                  ? "bg-linear-to-br from-[#8B1A1A] to-[#4a0a0a] shadow-red-200"
                  : "bg-white hover:shadow-md border border-gray-100"
              }`}
            >
              <div className={`p-3 rounded-2xl shrink-0 ${
                selectedSubject === subject ? "bg-white/20" : "bg-red-50"
              }`}>
                <FaUserCheck size={20} className={selectedSubject === subject ? "text-white" : "text-[#8B1A1A]"} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wide truncate ${
                  selectedSubject === subject ? "text-red-200" : "text-gray-500"
                }`}>{subject}</p>
                <p className={`text-3xl font-bold mt-0.5 ${
                  selectedSubject === subject ? "text-white" : "text-gray-800"
                }`}>{count}</p>
                <p className={`text-xs mt-0.5 ${
                  selectedSubject === subject ? "text-red-200" : "text-gray-400"
                }`}>present records</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Subject filter tabs (when user has multiple subjects) */}
      {userSubjects.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
            <FaBook className="inline mr-1 text-[#8B1A1A]" size={11} /> Filter:
          </span>
          <button
            onClick={() => setSelectedSubject("")}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              selectedSubject === ""
                ? "bg-[#8B1A1A] text-white shadow-sm shadow-red-200"
                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-[#8B1A1A]"
            }`}
          >
            All
          </button>
          {userSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(selectedSubject === sub ? "" : sub)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                selectedSubject === sub
                  ? "bg-[#8B1A1A] text-white shadow-sm shadow-red-200"
                  : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-[#8B1A1A]"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search by name or LRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-[#8B1A1A] bg-gray-50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {/* Date filter */}
          <div className="relative">
            <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-[#8B1A1A] bg-gray-50 text-gray-700"
            />
          </div>

          {filterDate && (
            <button onClick={() => setFilterDate("")} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              Clear Date
            </button>
          )}

          {/* Export button */}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            <FaFileExcel size={14} /> Export SF2
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {loading ? "Loading..." : `${filteredRecords.length} record${filteredRecords.length !== 1 ? "s" : ""} found${selectedSubject ? ` for ${selectedSubject}` : ""}`}
          </span>
          {(debouncedSearch || filterDate) && (
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">Filtered</span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-[#8B1A1A] border-t-transparent rounded-full mr-3" />
          Loading records...
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <FaClipboardList size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No attendance records found</p>
          <p className="text-gray-300 text-sm mt-1">Try adjusting your search or date filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dayName = getDayName(date);
            const dayRecords = grouped[date];
            return (
              <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-red-50 to-rose-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#8B1A1A] text-white px-3 py-1 rounded-lg text-xs font-bold">{dayName}</div>
                    <span className="text-gray-700 font-semibold text-sm">{date}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                    {dayRecords.length} student{dayRecords.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/60">
                        <th className="px-5 py-2.5 text-left font-semibold">#</th>
                        <th className="px-5 py-2.5 text-left font-semibold">LRN</th>
                        <th className="px-5 py-2.5 text-left font-semibold">Name</th>
                        <th className="px-5 py-2.5 text-left font-semibold">
                          <span className="flex items-center gap-1"><FaClock size={10} /> Time In</span>
                        </th>
                        <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                        {userSubjects.length > 1 && selectedSubject === "" && (
                          <th className="px-5 py-2.5 text-left font-semibold">Subject</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dayRecords.map((r, i) => (
                        <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-5 py-3 text-gray-500 font-mono text-xs">{r.lrn}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#8B1A1A] to-[#4a0a0a] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {r.name.charAt(0)}
                              </div>
                              <span className="text-gray-800 font-semibold">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-600 text-xs font-medium">{r.timeIn}</td>
                          <td className="px-5 py-3">
                            <span className={`${statusBadge(r.status)} text-xs font-semibold px-2.5 py-1 rounded-full`}>
                              {r.status}
                            </span>
                          </td>
                          {userSubjects.length > 1 && selectedSubject === "" && (
                            <td className="px-5 py-3">
                              {r.subject ? (
                                <span className="bg-red-50 text-[#8B1A1A] border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                                  {r.subject}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/*  Export SF2 Modal  */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="bg-linear-to-r from-emerald-600 to-green-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <FaFileExcel size={22} />
                <div>
                  <h2 className="font-bold text-base">Export SF2 Report</h2>
                  <p className="text-emerald-100 text-xs">DepEd Daily Attendance Report</p>
                </div>
              </div>
              <button onClick={() => setExportOpen(false)} className="text-white/70 hover:text-white">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
                  <input
                    type="number"
                    value={exportYear}
                    onChange={(e) => setExportYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">School Information</p>
                {[
                  { key: "schoolName", label: "Name of School" },
                  { key: "schoolId",   label: "School ID" },
                  { key: "schoolYear", label: "School Year" },
                  { key: "gradeLevel", label: "Grade Level" },
                  { key: "section",    label: "Section" },
                ].map(({ key, label }) => (
                  <div key={key} className="mb-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={schoolInfo[key]}
                      onChange={(e) => setSchoolInfo((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setExportOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportSF2}
                  disabled={exportLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {exportLoading ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Generating...</>
                  ) : (
                    <><FaFileExcel size={13} /> Download .xlsx</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackingPage;
