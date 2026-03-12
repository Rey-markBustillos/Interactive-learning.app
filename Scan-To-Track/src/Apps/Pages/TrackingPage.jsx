import { useState, useEffect, useCallback, useMemo } from "react";
import XLSXStyle from "xlsx-js-style";
import {
  FaSearch, FaCalendarAlt, FaClipboardList, FaClock,
  FaTimes, FaFileExcel, FaBook, FaUserCheck, FaLayerGroup, FaUsers,
  FaCheckCircle, FaTimesCircle, FaTrash,
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

function isWeekendDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

function normalizeSectionKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeGender(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "male" || raw === "m") return "male";
  if (raw === "female" || raw === "f") return "female";
  return "unspecified";
}

function formatDisplayTime(value) {
  const m = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return value || "--";
  const h24 = Number(m[1]);
  const mins = m[2];
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mins} ${suffix}`;
}

function getSectionSchedule(section) {
  return {
    presentStart: section?.presentStart || "",
    presentEnd: section?.presentEnd || "",
    lateStart: section?.lateStart || "",
    lateEnd: section?.lateEnd || "",
    // Fallback for legacy sections that only have timeIn/timeOut.
    legacyStart: section?.timeIn || "",
    legacyEnd: section?.timeOut || "",
  };
}

function getSectionScheduleText(section) {
  const sched = getSectionSchedule(section);
  if (sched.presentStart && sched.presentEnd && sched.lateStart && sched.lateEnd) {
    return `Present: ${formatDisplayTime(sched.presentStart)}-${formatDisplayTime(sched.presentEnd)} | Late: ${formatDisplayTime(sched.lateStart)}-${formatDisplayTime(sched.lateEnd)}`;
  }
  if (sched.legacyStart || sched.legacyEnd) {
    return `${formatDisplayTime(sched.legacyStart)} - ${formatDisplayTime(sched.legacyEnd)}`;
  }
  return "Schedule not set";
}

function TrackingPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("sections"); // "sections" | "records"
  const [sectionModal, setSectionModal] = useState(null); // section name or null

  // Students (for section cards)
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

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
  const [sectionExportOpen, setSectionExportOpen] = useState(null); // null | section name
  const [sectionExportLoading, setSectionExportLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "J. Payumo Jr. Memorial High School",
    schoolId: "30070",
    schoolYear: "2025-2026",
    gradeLevel: "12",
    section: "STEM 202",
  });

  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [addSectionForm, setAddSectionForm] = useState({
    name: "",
    assignedTeacherEmail: "",
    subject: "",
    presentStart: "",
    presentEnd: "",
    lateStart: "",
    lateEnd: "",
  });
  const [addSectionLoading, setAddSectionLoading] = useState(false);
  const [addSectionMsg, setAddSectionMsg] = useState({ text: "", type: "" });
  const [registeredTeachers, setRegisteredTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const isSectionAdmin = (currentUser.email || "").toLowerCase() === "admin@jcp.edu.ph";

  const selectedTeacherEmail = String(addSectionForm.assignedTeacherEmail || "").toLowerCase();

  const getTeacherSubjects = useCallback((teacherEmail = "") => {
    const normalizedTeacherEmail = String(teacherEmail || "").toLowerCase();
    const teacher = registeredTeachers.find(
      (t) => String(t.email || "").toLowerCase() === normalizedTeacherEmail
    );

    return Array.from(
      new Set([
        ...(Array.isArray(teacher?.subjects) ? teacher.subjects : []),
        ...sections
          .filter((s) => String(s.assignedTeacherEmail || "").toLowerCase() === normalizedTeacherEmail)
          .map((s) => String(s.subject || "").trim()),
      ].map((s) => String(s || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [registeredTeachers, sections]);

  const selectedTeacherSubjects = useMemo(
    () => getTeacherSubjects(selectedTeacherEmail),
    [getTeacherSubjects, selectedTeacherEmail]
  );
  const sectionNameOptions = Array.from(
    new Set([
      ...sections.map((s) => String(s.name || "").trim()),
      ...students.map((s) => String(s.section || "").trim()),
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch students for section cards
  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
      setStudentsLoading(false);
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchSections = async () => {
      setSectionsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/sections`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSections(Array.isArray(data) ? data : []);
        }
      } catch {
        setSections([]);
      } finally {
        setSectionsLoading(false);
      }
    };
    fetchSections();
  }, []);

  useEffect(() => {
    const fetchRegisteredTeachers = async () => {
      if (!isSectionAdmin) return;
      setTeachersLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setRegisteredTeachers([]);
          return;
        }
        const data = await res.json();
        const teachers = Array.isArray(data)
          ? data.filter((u) => u.role !== "admin").map((u) => ({
              _id: u._id,
              name: u.name || u.email,
              email: u.email || "",
              subjects: Array.isArray(u.subjects) ? u.subjects : [],
            }))
          : [];
        setRegisteredTeachers(teachers);
      } catch {
        setRegisteredTeachers([]);
      } finally {
        setTeachersLoading(false);
      }
    };

    fetchRegisteredTeachers();
  }, [isSectionAdmin]);

  useEffect(() => {
    if (!selectedTeacherEmail) return;

    // Keep subject aligned with selected teacher choices.
    if (selectedTeacherSubjects.length === 1 && addSectionForm.subject !== selectedTeacherSubjects[0]) {
      setAddSectionForm((prev) => ({ ...prev, subject: selectedTeacherSubjects[0] }));
      return;
    }

    if (
      selectedTeacherSubjects.length > 1 &&
      addSectionForm.subject &&
      !selectedTeacherSubjects.includes(addSectionForm.subject)
    ) {
      setAddSectionForm((prev) => ({ ...prev, subject: "" }));
    }
  }, [selectedTeacherEmail, selectedTeacherSubjects, addSectionForm.subject]);

  const handleAddSection = async (e) => {
    e.preventDefault();
    setAddSectionMsg({ text: "", type: "" });

    if (
      !addSectionForm.name.trim() ||
      !addSectionForm.assignedTeacherEmail.trim() ||
      !addSectionForm.subject.trim() ||
      !addSectionForm.presentStart ||
      !addSectionForm.presentEnd ||
      !addSectionForm.lateStart ||
      !addSectionForm.lateEnd
    ) {
      setAddSectionMsg({ text: "Please fill all fields.", type: "error" });
      return;
    }

    setAddSectionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/sections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addSectionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add section.");

      setSections((prev) => [...prev, data]);
      setAddSectionForm({
        name: "",
        assignedTeacherEmail: "",
        subject: "",
        presentStart: "",
        presentEnd: "",
        lateStart: "",
        lateEnd: "",
      });
      setAddSectionMsg({ text: "Section added successfully.", type: "success" });
    } catch (err) {
      setAddSectionMsg({ text: err.message || "Failed to add section.", type: "error" });
    } finally {
      setAddSectionLoading(false);
    }
  };

  const handleRemoveAssignment = async (sectionId, summaryText) => {
    const ok = window.confirm(`Remove this assignment?\n\n${summaryText}`);
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/sections/${sectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove assignment.");

      setSections((prev) => prev.filter((s) => s._id !== sectionId));
      setAddSectionMsg({ text: "Section assignment removed.", type: "success" });
    } catch (err) {
      setAddSectionMsg({ text: err.message || "Failed to remove assignment.", type: "error" });
    }
  };

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

  const handleExportSF2 = async (filterSection = null) => {
    if (filterSection) setSectionExportLoading(true); else setExportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const monthStr = `${exportYear}-${String(exportMonth).padStart(2, "0")}`;  

      const [studRes, attRes] = await Promise.all([
        fetch(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/attendance/all?month=${monthStr}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const allStudents = await studRes.json();
      const students = filterSection ? allStudents.filter((s) => s.section === filterSection) : allStudents;
      const attendance = await attRes.json();

      const weekdays = getWeekdays(exportYear, exportMonth);
      const monthName = MONTH_NAMES[exportMonth - 1];
      const totalCols = 2 + weekdays.length + 2; // #, Name, days, ABSENT, TARDY

      // attendance map: lrn → date → status (Present/Late)
      const attendanceMap = {};
      attendance.forEach((r) => {
        if (!attendanceMap[r.lrn]) attendanceMap[r.lrn] = {};
        attendanceMap[r.lrn][r.date] = r.status || "Present";
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
        late: {
          font: { bold: true, sz: 9, color: { rgb: "E65100" } },
          fill: { fgColor: { rgb: "FFF3E0" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        lateEven: {
          font: { bold: true, sz: 9, color: { rgb: "E65100" } },
          fill: { fgColor: { rgb: "FFE0B2" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        absent: {
          font: { bold: true, sz: 9, color: { rgb: "B71C1C" } },
          fill: { fgColor: { rgb: "FFEBEE" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        },
        absentEven: {
          font: { bold: true, sz: 9, color: { rgb: "B71C1C" } },
          fill: { fgColor: { rgb: "FFCDD2" } },
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

      const buildGenderSheet = (sheetStudents, genderLabel) => {
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
        setCell(R, 0, "(This replaced Form 1, Form 2 & STS Form 4 – Absenteeism and Dropout Profile) | Legend: / Present | ★ Late | A Absent", s.subtitle);
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

        // Row 3 — School Name / Grade / Section (with gender page label)
        const infoRow3 = [
          ["Name of School:", s.infoLabel], [schoolInfo.schoolName, s.infoValue], ["", s.blankFill], ["", s.blankFill], ["", s.blankFill], ["", s.blankFill],
          ["Grade Level:", s.infoLabel], [schoolInfo.gradeLevel, s.infoValue],
          ["Section:", s.infoLabel], [`${schoolInfo.section} (${genderLabel})`, s.infoValue],
        ];
        infoRow3.forEach(([v, st], c) => setCell(R, c, v, st));
        for (let c = infoRow3.length; c < totalCols; c++) setBlankCell(R, c, s.blankFill);
        R++;

        // Row 4 — Date number header
        setCell(R, 0, "#", s.colHeaderDate);
        setCell(R, 1, "LEARNER'S NAME (Last Name, First Name, Middle Name)", s.colHeaderName);
        weekdays.forEach((d, i) => setCell(R, 2 + i, d.getDate(), s.colHeaderDate));
        setCell(R, 2 + weekdays.length, "ABSENT", s.colHeaderSummary);
        setCell(R, 2 + weekdays.length + 1, "TARDY", s.colHeaderSummary);
        R++;

        // Row 5 — Day abbreviation header
        setBlankCell(R, 0, s.colHeaderDay);
        setCell(R, 1, "(1st row for date, 2nd row for Day: M,T,W,TH,F)", s.colHeaderDay);
        weekdays.forEach((d, i) => setCell(R, 2 + i, DAYS_SHORT[d.getDay()], s.colHeaderDay));
        setBlankCell(R, 2 + weekdays.length, s.colHeaderDay);
        setBlankCell(R, 2 + weekdays.length + 1, s.colHeaderDay);
        R++;

        // Student rows — / = present, ★ = late, A = absent
        const presentCounts = new Array(weekdays.length).fill(0);
        let totalAbsentAll = 0;
        let totalLateAll = 0;
        sheetStudents.forEach((stu, i) => {
          const isEven = i % 2 === 1;
          const nStyle = isEven ? s.nameEven : s.nameOdd;
          const numStyle = isEven ? s.numEven : s.numOdd;
          const pStyle = isEven ? s.presentEven : s.present;
          const lStyle = isEven ? s.lateEven : s.late;
          const aStyle = isEven ? s.absentEven : s.absent;

          setCell(R, 0, i + 1, numStyle);
          setCell(R, 1, stu.name, nStyle);

          const statusByDate = attendanceMap[stu.lrn] || {};
          let lateTotal = 0;
          let absentTotal = 0;

          weekdays.forEach((d, wi) => {
            const ds = fmtDate(d);
            const status = statusByDate[ds];
            if (status === "Late") {
              setCell(R, 2 + wi, "★", lStyle);
              lateTotal++;
              presentCounts[wi]++;
            } else if (status) {
              setCell(R, 2 + wi, "/", pStyle);
              presentCounts[wi]++;
            } else {
              setCell(R, 2 + wi, "A", aStyle);
              absentTotal++;
            }
          });

          setCell(R, 2 + weekdays.length, absentTotal, numStyle);
          setCell(R, 2 + weekdays.length + 1, lateTotal, numStyle);
          totalAbsentAll += absentTotal;
          totalLateAll += lateTotal;
          R++;
        });

        // Total present per day row
        setBlankCell(R, 0, s.totalRow);
        setCell(R, 1, "TOTAL PRESENT PER DAY", s.totalLabel);
        presentCounts.forEach((count, i) => setCell(R, 2 + i, count, s.totalRow));
        setCell(R, 2 + weekdays.length, totalAbsentAll, s.totalRow);
        setCell(R, 2 + weekdays.length + 1, totalLateAll, s.totalRow);
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
          ...sheetStudents.map(() => ({ hpt: 16 })),
          { hpt: 18 }, // total row
        ];

        // Merges
        ws["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // title
          { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // subtitle
          { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } }, // school ID value span
          { s: { r: 2, c: 5 }, e: { r: 2, c: 7 } }, // school year value span
          { s: { r: 3, c: 1 }, e: { r: 3, c: 5 } }, // school name value span
          { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, // # merge rows
          { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } }, // name merge rows
          { s: { r: 4, c: totalCols - 2 }, e: { r: 5, c: totalCols - 2 } }, // ABSENT
          { s: { r: 4, c: totalCols - 1 }, e: { r: 5, c: totalCols - 1 } }, // TARDY
        ];

        // Freeze pane below header rows, after name col
        ws["!freeze"] = { xSplit: 2, ySplit: 6 };

        return ws;
      };

      const maleStudents = students.filter((stu) => normalizeGender(stu.gender) === "male");
      const femaleStudents = students.filter((stu) => normalizeGender(stu.gender) === "female");
      const unspecifiedStudents = students.filter((stu) => normalizeGender(stu.gender) === "unspecified");

      const wb = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(wb, buildGenderSheet(maleStudents, "Male"), `Page 1 - Male`);
      XLSXStyle.utils.book_append_sheet(wb, buildGenderSheet(femaleStudents, "Female"), `Page 2 - Female`);
      if (unspecifiedStudents.length > 0) {
        XLSXStyle.utils.book_append_sheet(wb, buildGenderSheet(unspecifiedStudents, "Unspecified"), `Page 3 - Unspecified`);
      }
      XLSXStyle.writeFile(wb, `SF2_${monthStr}_${(filterSection || schoolInfo.section).replace(/\s+/g, "_")}.xlsx`);
      if (filterSection) setSectionExportOpen(null); else setExportOpen(false);
    } catch (err) {
      console.error(err);
      alert("Export failed. Make sure the backend is running.");
    } finally {
      if (filterSection) setSectionExportLoading(false); else setExportLoading(false);
    }
  };

  // Group students by section
  const sectionMap = students.reduce((acc, s) => {
    const sec = (s.section || "No Section").trim();
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(s);
    return acc;
  }, {});

  const sectionInfoMap = sections.reduce((acc, s) => {
    acc[normalizeSectionKey(s.name)] = s;
    return acc;
  }, {});

  const sectionList = Array.from(
    new Set([...Object.keys(sectionMap), ...sections.map((s) => String(s.name || "").trim()).filter(Boolean)])
  ).sort((a, b) => a.localeCompare(b));

  const teacherAssignmentMap = sections.reduce((acc, section) => {
    const key = String(section.assignedTeacherEmail || section.assignedTeacher || "").toLowerCase();
    if (!key) return acc;
    if (!acc[key]) {
      acc[key] = {
        name: section.assignedTeacher || section.assignedTeacherEmail,
        email: section.assignedTeacherEmail || "",
        items: [],
      };
    }
    acc[key].items.push(section);
    return acc;
  }, {});

  const teacherAssignments = Object.values(teacherAssignmentMap).sort((a, b) => a.name.localeCompare(b.name));

  // Per-student attendance stats from all records (for modal)
  const totalDays = new Set(records.map((r) => r.date).filter((dateStr) => !isWeekendDate(dateStr))).size;
  const presentMap = {}; // lrn → count
  const lateMap = {};    // lrn → count
  records.forEach((r) => {
    if (isWeekendDate(r.date)) return;
    if (r.status === "Late") lateMap[r.lrn] = (lateMap[r.lrn] || 0) + 1;
    else presentMap[r.lrn] = (presentMap[r.lrn] || 0) + 1;
  });
  const getAbsent = (lrn) => totalDays - (presentMap[lrn] || 0) - (lateMap[lrn] || 0);

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

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab("sections")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "sections"
              ? "bg-[#8B1A1A] text-white shadow-sm"
              : "text-gray-500 hover:text-[#8B1A1A] hover:bg-red-50"
          }`}
        >
          <FaLayerGroup size={13} /> Sections
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "records"
              ? "bg-[#8B1A1A] text-white shadow-sm"
              : "text-gray-500 hover:text-[#8B1A1A] hover:bg-red-50"
          }`}
        >
          <FaClipboardList size={13} /> Tracking & Records
        </button>
      </div>

      {/* ── SECTIONS TAB ── */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          {isSectionAdmin && (
            <form onSubmit={handleAddSection} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Add Section</h3>
                <p className="text-xs text-gray-400 mt-0.5">Visible only to admin@jcp.edu.ph</p>
              </div>

              {addSectionMsg.text && (
                <div className={`px-3 py-2 rounded-xl text-xs font-medium ${addSectionMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {addSectionMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  list="section-name-options"
                  value={addSectionForm.name}
                  onChange={(e) => setAddSectionForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Select or type Section Name"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                  required
                />
                <datalist id="section-name-options">
                  {sectionNameOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <p className="text-[11px] text-gray-400 mt-1">
                  Section options are based on existing section and student records.
                </p>
                <select
                  value={addSectionForm.assignedTeacherEmail}
                  onChange={(e) => {
                    const teacherEmail = e.target.value;
                    const nextTeacherSubjects = getTeacherSubjects(teacherEmail);
                    setAddSectionForm((prev) => ({
                      ...prev,
                      assignedTeacherEmail: teacherEmail,
                      subject: nextTeacherSubjects.length === 1 ? nextTeacherSubjects[0] : "",
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                  required
                >
                  <option value="" disabled>
                    {teachersLoading ? "Loading teachers..." : "Assign Teacher"}
                  </option>
                  {registeredTeachers.map((t) => (
                    <option key={t._id} value={t.email}>
                      {t.name}{t.email ? ` (${t.email})` : ""}
                    </option>
                  ))}
                </select>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
                  <input
                    type="text"
                    list="teacher-subject-options"
                    value={addSectionForm.subject}
                    onChange={(e) => setAddSectionForm((prev) => ({ ...prev, subject: e.target.value }))}
                    disabled={!selectedTeacherEmail}
                    placeholder={!selectedTeacherEmail ? "Select teacher first" : "Type or select teacher subject"}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                    required
                  />
                  <datalist id="teacher-subject-options">
                    {selectedTeacherSubjects.map((subj) => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </datalist>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {selectedTeacherEmail
                      ? (selectedTeacherSubjects.length > 0
                        ? "Subject suggestions are based on the selected teacher's records."
                        : "No previous subject yet; type the teacher's subject manually.")
                      : "Choose a teacher first, then enter the teacher's subject."}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Present Start</label>
                  <input
                    type="time"
                    value={addSectionForm.presentStart}
                    onChange={(e) => setAddSectionForm((prev) => ({ ...prev, presentStart: e.target.value }))}
                    title="Present Start"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Present End</label>
                  <input
                    type="time"
                    value={addSectionForm.presentEnd}
                    onChange={(e) => setAddSectionForm((prev) => ({ ...prev, presentEnd: e.target.value }))}
                    title="Present End"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Late Start</label>
                  <input
                    type="time"
                    value={addSectionForm.lateStart}
                    onChange={(e) => setAddSectionForm((prev) => ({ ...prev, lateStart: e.target.value }))}
                    title="Late Start"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Late End</label>
                  <input
                    type="time"
                    value={addSectionForm.lateEnd}
                    onChange={(e) => setAddSectionForm((prev) => ({ ...prev, lateEnd: e.target.value }))}
                    title="Late End"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                    required
                  />
                </div>
              </div>

              {!teachersLoading && registeredTeachers.length === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  No registered user account found yet for Assign Teacher.
                </p>
              )}

              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Teacher Assignment Summary</h4>
                {teacherAssignments.length === 0 ? (
                  <p className="text-xs text-gray-400">No teacher assignments yet.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {teacherAssignments.map((teacher) => (
                      <div key={teacher.email || teacher.name} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <p className="text-sm font-semibold text-gray-800">{teacher.name}</p>
                        {teacher.email && <p className="text-[11px] text-gray-500 mb-1.5">{teacher.email}</p>}
                        <div className="space-y-1">
                          {teacher.items
                            .slice()
                            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
                            .map((item) => (
                              <div key={item._id || `${item.name}-${item.subject}`} className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="font-semibold">{item.name}</span>
                                  {" | "}
                                  {item.subject}
                                  {" | "}
                                  {getSectionScheduleText(item)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignment(item._id, `${item.name} | ${item.subject}`)}
                                  className="shrink-0 px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                  title="Remove assignment"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={addSectionLoading}
                className="px-4 py-2.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1010] disabled:bg-red-300 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {addSectionLoading ? "Saving..." : "Save Section"}
              </button>
            </form>
          )}

          {studentsLoading || sectionsLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-[#8B1A1A] border-t-transparent rounded-full mr-3" />
              Loading sections...
            </div>
          ) : sectionList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <FaLayerGroup size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">No students added yet</p>
              <p className="text-gray-300 text-sm mt-1">Go to Add Student to register students with their section</p>
            </div>
          ) : (
            sectionList.map((section) => {
              const secStudents = sectionMap[section] || [];
              const meta = sectionInfoMap[normalizeSectionKey(section)];
              return (
                <button
                  key={section}
                  onClick={() => setSectionModal(section)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-200 transition-all cursor-pointer text-left"
                >
                  {/* Section header */}
                  <div className="bg-linear-to-r from-[#8B1A1A] to-[#4a0a0a] px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-xl">
                        <FaLayerGroup size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{section}</p>
                        <p className="text-red-200 text-xs">{secStudents.length} student{secStudents.length !== 1 ? "s" : ""} — tap to view</p>
                        {meta && (
                          <p className="text-red-100 text-[11px] mt-0.5">
                            {meta.assignedTeacher} | {meta.subject} | {getSectionScheduleText(meta)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <FaUsers size={11} /> {secStudents.length}
                    </div>
                    {isSectionAdmin && meta && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleRemoveAssignment(meta._id, `${meta.name} | ${meta.subject}`); }}
                        className="ml-2 p-2 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                        title="Delete section"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                  {/* Preview row */}
                  <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
                    {secStudents.slice(0, 5).map((s) => (
                      <span key={s._id} className="w-7 h-7 rounded-full bg-red-100 text-[#8B1A1A] flex items-center justify-center font-bold text-xs" title={s.name}>
                        {s.name.charAt(0)}
                      </span>
                    ))}
                    {secStudents.length > 5 && (
                      <span className="text-xs text-gray-400">+{secStudents.length - 5} more</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── SECTION DETAIL MODAL ── */}
      {sectionModal && (() => {
        const secStudents = sectionMap[sectionModal] || [];
        const sectionMeta = sectionInfoMap[normalizeSectionKey(sectionModal)];
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSectionModal(null)}>
            <div className="bg-white w-full h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal header */}
              <div className="bg-linear-to-r from-[#8B1A1A] to-[#4a0a0a] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <FaLayerGroup size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base sm:text-lg">{sectionModal}</h2>
                    <p className="text-red-200 text-xs">{secStudents.length} student{secStudents.length !== 1 ? "s" : ""}</p>
                    {sectionMeta && (
                      <p className="text-red-100 text-[11px] mt-0.5">
                        Teacher: {sectionMeta.assignedTeacher} | Subject: {sectionMeta.subject} | {getSectionScheduleText(sectionMeta)}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSectionModal(null)} className="text-white/70 hover:text-white transition cursor-pointer">
                  <FaTimes size={18} />
                </button>
              </div>

              {/* Summary stats bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-gray-100 bg-gray-50 shrink-0">
                <div className="flex flex-col items-center py-3">
                  <span className="text-xl font-bold text-green-600">{secStudents.reduce((sum, s) => sum + (presentMap[s.lrn] || 0), 0)}</span>
                  <span className="text-xs text-gray-400 mt-0.5">Total Present</span>
                </div>
                <div className="flex flex-col items-center py-3">
                  <span className="text-xl font-bold text-orange-500">{secStudents.reduce((sum, s) => sum + (lateMap[s.lrn] || 0), 0)}</span>
                  <span className="text-xs text-gray-400 mt-0.5">Total Late</span>
                </div>
                <div className="flex flex-col items-center py-3">
                  <span className="text-xl font-bold text-red-500">{secStudents.reduce((sum, s) => sum + Math.max(0, getAbsent(s.lrn)), 0)}</span>
                  <span className="text-xs text-gray-400 mt-0.5">Total Absent</span>
                </div>
              </div>

              {/* Student table */}
              <div className="overflow-auto flex-1">
                <table className="w-full min-w-190 text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      <th className="px-4 sm:px-5 py-3 text-left font-semibold">#</th>
                      <th className="px-4 sm:px-5 py-3 text-left font-semibold">LRN</th>
                      <th className="px-4 sm:px-5 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 sm:px-5 py-3 text-left font-semibold">Gender</th>
                      <th className="px-4 sm:px-5 py-3 text-left font-semibold">Section</th>
                      <th className="px-4 sm:px-5 py-3 text-center font-semibold text-green-600">Present</th>
                      <th className="px-4 sm:px-5 py-3 text-center font-semibold text-orange-500">Late</th>
                      <th className="px-4 sm:px-5 py-3 text-center font-semibold text-red-500">Absent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {secStudents.map((s, i) => {
                      const p = presentMap[s.lrn] || 0;
                      const l = lateMap[s.lrn] || 0;
                      const a = Math.max(0, getAbsent(s.lrn));
                      return (
                        <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 sm:px-5 py-3 text-gray-500 font-mono text-xs">{s.lrn}</td>
                          <td className="px-4 sm:px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#8B1A1A] to-[#4a0a0a] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {s.name.charAt(0)}
                              </div>
                              <span className="text-gray-800 font-semibold">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-5 py-3 text-gray-600 text-xs">{s.gender || "-"}</td>
                          <td className="px-4 sm:px-5 py-3">
                            <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full">{s.section}</span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full">
                              <FaCheckCircle size={10} /> {p}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-500 text-xs font-bold px-2.5 py-1 rounded-full">
                              <FaClock size={10} /> {l}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 text-xs font-bold px-2.5 py-1 rounded-full">
                              <FaTimesCircle size={10} /> {a}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal footer — Export SF2 */}
              <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-gray-400">{secStudents.length} student{secStudents.length !== 1 ? "s" : ""} in this section</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setSchoolInfo((prev) => ({ ...prev, section: sectionModal })); setSectionExportOpen(sectionModal); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  <FaFileExcel size={13} /> Export SF2
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SECTION EXPORT MODAL ── */}
      {sectionExportOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSectionExportOpen(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-linear-to-r from-emerald-600 to-green-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <FaFileExcel size={22} />
                <div>
                  <h2 className="font-bold text-base">Export SF2 — {sectionExportOpen}</h2>
                  <p className="text-emerald-100 text-xs">DepEd Daily Attendance Report</p>
                </div>
              </div>
              <button onClick={() => setSectionExportOpen(null)} className="text-white/70 hover:text-white cursor-pointer"><FaTimes size={16} /></button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Month</label>
                  <select value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Year</label>
                  <input type="number" value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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

              <div className="flex gap-3 pt-1">
                <button onClick={() => setSectionExportOpen(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
                <button
                  onClick={() => handleExportSF2(sectionExportOpen)}
                  disabled={sectionExportLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sectionExportLoading ? (
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

      {/* ── RECORDS TAB ── */}
      {activeTab === "records" && (
        <div className="space-y-5">

      {/* Per-subject summary cards */}
      {subjectCounts.length > 0 && (
        <div className={`grid gap-4 ${subjectCounts.length === 1 ? "grid-cols-1 max-w-xs" : subjectCounts.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
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
                        <th className="px-5 py-2.5 text-left font-semibold">Gender</th>
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
                          <td className="px-5 py-3 text-gray-600 text-xs">{r.gender || "-"}</td>
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
      )}

    </div>
  );
}

export default TrackingPage;
