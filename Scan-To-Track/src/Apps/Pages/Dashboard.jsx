import { useState, useRef, useCallback, useEffect } from "react";
import Swal from 'sweetalert2';
import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import SideNav from "../components/SideNav";
import AttendancePage from "./AttendancePage";
import AddStudentPage from "./AddStudentPage";
import ListStudentsPage from "./ListStudentsPage";
import ReportPage from "./ReportPage";
import AboutPage from "./AboutPage";
import TrackingPage from "./TrackingPage";

const API = import.meta.env.VITE_API_URL;

// Returns today's date in YYYY-MM-DD using the device's LOCAL timezone (not UTC)
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Dashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("attendance");

  //  Current user (subjects)
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [userSubjects, setUserSubjects] = useState(currentUser.subjects || []);
  const [selectedSubject, setSelectedSubject] = useState((currentUser.subjects || [])[0] || "");

  //  Shared data
  const [students, setStudents] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  //  Camera / scan state
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  //  Add Student form state
  const [addForm, setAddForm] = useState({ lrn: "", name: "", section: "" });
  const [addMsg, setAddMsg] = useState({ text: "", type: "" });
  const [addLoading, setAddLoading] = useState(false);

  //  Report state
  const [reportDate, setReportDate] = useState(() => localDate());
  const [reportList, setReportList] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const getToken = () => localStorage.getItem("token");

  // Assign stream to video element once it renders
  useEffect(() => {
    if (scanning && videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
    }
  }, [scanning, activeStream]);

  // Key used to store today's offline records in localStorage (uses LOCAL date)
  const offlineKey = () => `offline_attendance_${localDate()}`;

  // Push any _offline records to the server (runs after we confirm connectivity)
  const syncOfflineRecords = async (token) => {
    const key = offlineKey();
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const pending = saved.filter((r) => r._offline);
    if (pending.length === 0) return;

    const synced = [];
    for (const record of pending) {
      try {
        const res = await fetch(`${API}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lrn: record.lrn, date: record.date || localDate() }),
        });
        // 201 = saved, 400 with "already marked" = already in DB from another device
        if (res.ok || res.status === 400) synced.push(record.lrn);
      } catch { /* still offline, leave for next load */ }
    }

    if (synced.length > 0) {
      // Remove _offline flag from synced records
      const updated = saved.map((r) =>
        synced.includes(r.lrn) ? { ...r, _offline: undefined } : r
      );
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };

  // Fetch students + today's attendance on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { navigate("/"); return; }

    // Immediately show any offline records saved today so the list is never blank
    const saved = JSON.parse(localStorage.getItem(offlineKey()) || "[]");
    if (saved.length > 0) setAttendanceList(saved);

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/students`, { headers }).then((r) => r.json()),
      fetch(`${API}/attendance?date=${localDate()}`, { headers }).then((r) => r.json()),
      fetch(`${API}/auth/me`, { headers }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(async ([s, a, me]) => {
        // Refresh subjects from the DB — fixes stale localStorage (e.g. registered before subjects feature)
        if (me && me._id) {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          const freshUser = { ...stored, subjects: me.subjects || [] };
          localStorage.setItem("user", JSON.stringify(freshUser));
          const freshSubjects = me.subjects || [];
          setUserSubjects(freshSubjects);
          setSelectedSubject((prev) => prev || freshSubjects[0] || "");
        }
        if (Array.isArray(s)) setStudents(s);

        // Sync any offline records FIRST so the subsequent fetch gets them all
        await syncOfflineRecords(token);

        // Re-fetch attendance after sync
        const fresh = await fetch(`${API}/attendance?date=${localDate()}`, { headers }).then((r) => r.json()).catch(() => null);

        // Only use the API result if it is actually an array — never treat a server error as empty
        const apiRecords = Array.isArray(fresh) ? fresh : (Array.isArray(a) ? a : null);

        if (apiRecords !== null) {
          // Merge API records with any still-offline records (couldn't sync)
          const offlineSaved = JSON.parse(localStorage.getItem(offlineKey()) || "[]");
          const merged = [...apiRecords];
          offlineSaved.filter((ol) => ol._offline).forEach((ol) => {
            if (!merged.some((r) => r.lrn === ol.lrn)) merged.push(ol);
          });
          // Only persist when we have a confirmed good response so we don't wipe data
          localStorage.setItem(offlineKey(), JSON.stringify(merged));
          setAttendanceList(merged);
        }
        // If server returned an error (sleeping Render), keep whatever is already shown
      })
      .catch(() => {
        // Backend unreachable — keep offline records, do NOT force logout
        const offlineSaved = JSON.parse(localStorage.getItem(offlineKey()) || "[]");
        if (offlineSaved.length > 0) setAttendanceList(offlineSaved);
      });
  }, [navigate]);

  // Stop camera when leaving attendance page
  useEffect(() => {
    if (activePage !== "attendance") stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  // Only use students fetched from the server — never match against dummy data
  const studentList = students;

  //  Camera helpers
  const startCamera = async (mode = "environment") => {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setActiveStream(stream);
      setFacingMode(mode);
      setScanning(true);
    } catch {
      setMessage("Camera access denied or not available.");
      setMessageType("error");
    }
  };

  const switchCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActiveStream(null);
    await startCamera(nextMode);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActiveStream(null);
    setScanning(false);
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (studentList.length === 0) {
      setMessage("No students loaded. Please add students first before scanning.");
      setMessageType("error");
      return;
    }
    setProcessing(true);
    setMessage("Reading ID... Hold the ID steady.");
    setMessageType("");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    // ── Image preprocessing: colored text (red/blue LRN) → black ───
    const procCanvas = document.createElement("canvas");
    procCanvas.width  = canvas.width  * 2;
    procCanvas.height = canvas.height * 2;
    const pctx = procCanvas.getContext("2d");
    pctx.drawImage(canvas, 0, 0, procCanvas.width, procCanvas.height);
    const imgData = pctx.getImageData(0, 0, procCanvas.width, procCanvas.height);
    const px = imgData.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      // Wider detection covers laminated cards with red/orange/blue color shift
      const isColored = (r > 120 && r > g + 40 && r > b + 40) ||
                        (b > 120 && b > r + 40 && b > g + 20);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // Threshold 100 (not 145) — avoids green card background becoming noise
      const v = (gray < 100 || isColored) ? 0 : 255;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    pctx.putImageData(imgData, 0, 0);

    try {
      // Run OCR on BOTH frames in parallel:
      //   original  → best for standard black text (name, grade, etc.)
      //   processed → best for red/colored text (LRN/ID numbers)
      const ocrOpts = { tessedit_pageseg_mode: "11" };
      const [res1, res2] = await Promise.all([
        Tesseract.recognize(canvas, "eng", ocrOpts),
        Tesseract.recognize(procCanvas, "eng", ocrOpts),
      ]);
      const text = res1.data.text + "\n" + res2.data.text;
      const up = text.toUpperCase();
      let matched = null;

      // ── OCR correction helpers ─────────────────────────────────────
      // Fix letters OCR misreads as digits → extract a clean digit string
      const toDigits = (s) =>
        s.toUpperCase()
          .replace(/O/g, "0").replace(/[ILl|]/g, "1")
          .replace(/S/g, "5").replace(/B/g, "8")
          .replace(/G/g, "6").replace(/Z/g, "2")
          .replace(/\D/g, "");

      // Fix digits OCR misreads as letters → normalize text for name matching
      const toLetters = (s) =>
        s.toUpperCase()
          .replace(/0/g, "O").replace(/1/g, "I")
          .replace(/5/g, "S").replace(/8/g, "B");

      // True if two same-length words of 4+ chars differ by at most 1 character
      const wordClose = (a, b) => {
        if (a === b) return true;
        if (a.length < 4 || a.length !== b.length) return false;
        let diffs = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diffs > 1) return false;
        return true;
      };

      // Tokenize OCR text into words (raw and letter-normalized)
      const ocrWords     = up.split(/[\s,.\-_|/\\:;]+/).filter((w) => w.length > 1);
      const ocrWordsNorm = toLetters(up).split(/[\s,.\-_|/\\:;]+/).filter((w) => w.length > 1);

      // ── LRN matching ──────────────────────────────────────────────
      // Pass 1: any digit run that exactly matches a student's LRN
      const digitRuns = [...text.matchAll(/\d+/g)].map((m) => m[0]);
      if (!matched) {
        matched = studentList.find((s) => digitRuns.includes(s.lrn));
      }

      // Pass 2: strip non-digits, slide a window per each student's LRN length
      //         (handles OCR inserting spaces inside the number)
      if (!matched) {
        const d1 = text.replace(/\D/g, "");
        matched = studentList.find((s) => {
          const len = s.lrn.length;
          for (let i = 0; i <= d1.length - len; i++) {
            if (d1.slice(i, i + len) === s.lrn) return true;
          }
          return false;
        });
      }

      // Pass 3: apply letter→digit corrections, then slide window per LRN length
      //         (e.g. OCR reads "1364S6780009" → S corrected to 5)
      if (!matched) {
        const d2 = toDigits(text);
        matched = studentList.find((s) => {
          const len = s.lrn.length;
          for (let i = 0; i <= d2.length - len; i++) {
            if (d2.slice(i, i + len) === s.lrn) return true;
          }
          return false;
        });
      }

      // ── Name matching ─────────────────────────────────────────────
      // Pass 4: exact name substring in raw OCR text
      if (!matched) {
        matched = studentList.find((s) => up.includes(s.name.toUpperCase()));
      }

      // Pass 5: exact name substring after digit→letter normalization
      //         (e.g. OCR reads "JUAN 0ELA CRUZ" → 0 corrected to O)
      if (!matched) {
        const normText = toLetters(up);
        matched = studentList.find((s) => normText.includes(toLetters(s.name.toUpperCase())));
      }

      // Pass 6: every word of the name found exactly among OCR tokens
      if (!matched) {
        matched = studentList.find((s) => {
          const nw = toLetters(s.name.toUpperCase()).split(/\s+/).filter((w) => w.length > 1);
          return nw.length > 0 && nw.every((w) => ocrWordsNorm.includes(w));
        });
      }

      // Pass 7: every word has a close match (≤1 char diff) among OCR tokens
      if (!matched) {
        matched = studentList.find((s) => {
          const nw = toLetters(s.name.toUpperCase()).split(/\s+/).filter((w) => w.length > 1);
          return nw.length > 0 && nw.every((w) => ocrWordsNorm.some((ow) => wordClose(w, ow)));
        });
      }

      // Pass 8: fuzzy majority — at least 50% of words match closely
      //         (handles partial visibility or badly lit sections of the card)
      if (!matched) {
        const scored = studentList
          .map((s) => {
            const nw = toLetters(s.name.toUpperCase()).split(/\s+/).filter((w) => w.length > 1);
            const hits = nw.filter((w) => ocrWordsNorm.some((ow) => w === ow || wordClose(w, ow))).length;
            return { student: s, hits, total: nw.length };
          })
          .filter(({ hits, total }) => total >= 2 && hits >= Math.ceil(total * 0.5))
          .sort((a, b) => b.hits / b.total - a.hits / a.total);
        if (scored.length > 0) matched = scored[0].student;
      }

      if (!matched) {
        const preview = text.replace(/\s+/g, " ").trim().slice(0, 120);
        setMessage(`No match found. OCR read: "${preview || "(nothing — try holding the ID steadier)"}"`);
        setMessageType("error");
        setProcessing(false);
        return;
      }
      if (attendanceList.some((a) => a.lrn === matched.lrn && (a.subject || "") === (selectedSubject || ""))) {
        setMessage(matched.name + " is already marked present" + (selectedSubject ? ` for ${selectedSubject}` : "") + ".");
        setMessageType("warning");
        setProcessing(false);
        return;
      }
      try {
        const res = await fetch(`${API}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ lrn: matched.lrn, date: localDate(), subject: selectedSubject }),
        });
        const d = await res.json();
        if (!res.ok) { setMessage(d.message || "Failed to mark attendance"); setMessageType("warning"); setProcessing(false); return; }
        setAttendanceList((prev) => {
          const updated = [d, ...prev];
          // Cache to localStorage so records survive logout even if backend goes down later
          localStorage.setItem(offlineKey(), JSON.stringify(updated));
          return updated;
        });
        Swal.fire({
          icon: 'success',
          title: 'Attendance Recorded!',
          text: `${d.name} (LRN: ${d.lrn}) marked present.`,
          confirmButtonColor: '#8B1A1A',
          timer: 1800,
          timerProgressBar: true,
          showConfirmButton: false
        });
        setMessage("");
        setMessageType("");
      } catch {
        // Store date so we can sync this record to the server later
        const offlineRecord = { ...matched, date: localDate(), timeIn: new Date().toLocaleTimeString(), status: "Present", subject: selectedSubject, _offline: true };
        setAttendanceList((prev) => [offlineRecord, ...prev]);
        // Persist to localStorage so the record survives logout
        const key = offlineKey();
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        if (!existing.some((r) => r.lrn === matched.lrn)) {
          localStorage.setItem(key, JSON.stringify([offlineRecord, ...existing]));
        }
        setMessage(matched.name + " (LRN: " + matched.lrn + ") - Present! (saved offline, will sync when connected)");
        setMessageType("success");
      }
    } catch {
      setMessage("Error reading ID. Please try again.");
      setMessageType("error");
    }
    setProcessing(false);
  };

  //  Add Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg({ text: "", type: "" });
    try {
      const res = await fetch(`${API}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(addForm),
      });
      const d = await res.json();
      if (!res.ok) { setAddMsg({ text: d.message, type: "error" }); setAddLoading(false); return; }
      setStudents((prev) => [...prev, d]);
      setAddForm({ lrn: "", name: "", section: "" });
      setAddMsg({ text: d.name + " added successfully!", type: "success" });
    } catch {
      setAddMsg({ text: "Server not reachable. Check backend.", type: "error" });
    }
    setAddLoading(false);
  };

  //  Bulk Import Students
  const handleBulkImport = async (rows) => {
    const res = await fetch(`${API}/students/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ students: rows }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || "Import failed");
    if (Array.isArray(d.students)) setStudents((prev) => [...prev, ...d.students]);
    return d;
  };

  //  Delete Student
  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      const student = students.find((s) => s._id === id);
      await fetch(`${API}/students/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setStudents((prev) => prev.filter((s) => s._id !== id));
      if (student) {
        setAttendanceList((prev) => {
          const updated = prev.filter((a) => a.lrn !== student.lrn);
          localStorage.setItem(offlineKey(), JSON.stringify(updated));
          return updated;
        });
      }
    } catch { /* ignore */ }
  };

  //  Bulk Delete Students
  const handleBulkDelete = async (ids) => {
    const toDelete = students.filter((s) => ids.includes(s._id));
    const lrnsToDelete = new Set(toDelete.map((s) => s.lrn));
    await Promise.all(
      ids.map((id) =>
        fetch(`${API}/students/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        })
      )
    );
    setStudents((prev) => prev.filter((s) => !ids.includes(s._id)));
    setAttendanceList((prev) => {
      const updated = prev.filter((a) => !lrnsToDelete.has(a.lrn));
      localStorage.setItem(offlineKey(), JSON.stringify(updated));
      return updated;
    });
  };

  //  Archive Students (frontend: removes from active list)
  const [archivedStudents, setArchivedStudents] = useState([]);
  const handleArchiveStudents = (ids) => {
    const toArchive = students.filter((s) => ids.includes(s._id));
    setArchivedStudents((prev) => [...prev, ...toArchive]);
    setStudents((prev) => prev.filter((s) => !ids.includes(s._id)));
  };

  //  Retrieve Student from Archive
  const handleRetrieveStudent = (id) => {
    const student = archivedStudents.find((s) => s._id === id);
    if (!student) return;
    setStudents((prev) => prev.some((s) => s._id === id) ? prev : [...prev, student]);
    setArchivedStudents((prev) => prev.filter((s) => s._id !== id));
  };

  //  All Attendance (for per-student totals in List Students)
  const [allAttendance, setAllAttendance] = useState([]);
  useEffect(() => {
    if (activePage !== "list-students") return;
    // Always start with today's scanned records (present in state)
    // so per-student counts are correct even when the backend is offline
    const mergeWithToday = (apiRecords) => {
      const merged = Array.isArray(apiRecords) ? [...apiRecords] : [];
      attendanceList.forEach((a) => {
        if (!merged.some((r) => r.lrn === a.lrn && r.date === a.date)) {
          merged.push(a);
        }
      });
      return merged;
    };
    fetch(`${API}/attendance/all`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((d) => { setAllAttendance(mergeWithToday(d)); })
      .catch(() => { setAllAttendance(mergeWithToday([])); });
  }, [activePage, attendanceList]);

  //  Report
  const fetchReport = async (date) => {
    setReportLoading(true);
    try {
      const res = await fetch(`${API}/attendance?date=${date}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (Array.isArray(d)) setReportList(d);
    } catch { /* ignore */ }
    setReportLoading(false);
  };

  useEffect(() => {
    if (activePage === "report") fetchReport(reportDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, reportDate]);

  //  Stats
  const totalStudents = studentList.length;
  const presentCount = attendanceList.length;
  const absentCount = totalStudents - presentCount;

  const pageTitles = {
    "attendance": "Attendance Today",
    "add-student": "Add Student",
    "tracking": "Tracking & Sections",
    "list-students": "List Students",
    "report": "Report",
    "about": "About",
  };

  const renderPage = () => {
    if (activePage === "add-student") {
      return (
        <AddStudentPage
          addForm={addForm}
          setAddForm={setAddForm}
          addMsg={addMsg}
          addLoading={addLoading}
          handleAddStudent={handleAddStudent}
          handleBulkImport={handleBulkImport}
        />
      );
    }
    if (activePage === "list-students") {
      return (
        <ListStudentsPage
          studentList={studentList}
          archivedStudents={archivedStudents}
          allAttendance={allAttendance}
          handleBulkDelete={handleBulkDelete}
          handleArchiveStudents={handleArchiveStudents}
          handleRetrieveStudent={handleRetrieveStudent}
        />
      );
    }
    if (activePage === "report") {
      return (
        <ReportPage
          reportDate={reportDate}
          setReportDate={setReportDate}
          reportList={reportList}
          reportLoading={reportLoading}
          totalStudents={totalStudents}
        />
      );
    }
    if (activePage === "about") {
      return <AboutPage />;
    }
    if (activePage === "tracking") {
      return <TrackingPage />;
    }
    return (
      <AttendancePage
        totalStudents={totalStudents}
        presentCount={presentCount}
        absentCount={absentCount}
        scanning={scanning}
        processing={processing}
        message={message}
        messageType={messageType}
        videoRef={videoRef}
        canvasRef={canvasRef}
        startCamera={startCamera}
        stopCamera={stopCamera}
        captureAndScan={captureAndScan}
        switchCamera={switchCamera}
        facingMode={facingMode}
        attendanceList={attendanceList}
        subjects={userSubjects}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
      />
    );
  };

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden">
      <SideNav active={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navbar */}
        <nav className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 md:hidden" />
            <div className="flex items-center gap-3">
              <div className="hidden md:block w-1 h-6 bg-[#8B1A1A] rounded-full" />
              <div>
                <h2 className="text-base font-bold text-gray-800">{pageTitles[activePage]}</h2>
                <p className="text-xs text-gray-400 hidden sm:block">
                  {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
                {userSubjects.length > 0 && (
                  <p className="text-xs text-[#8B1A1A] font-semibold hidden sm:block">{userSubjects.join(" · ")}</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate("/");
            }}
            className="group flex items-center gap-2 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white border border-red-200 hover:border-red-600 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-red-200"
          >
            <FaSignOutAlt size={13} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Logout
          </button>
        </nav>
        {/* Subject navbar badge (shows if a subject is selected) */}
        {selectedSubject && (
          <div className="w-full flex justify-center bg-white border-b border-gray-100 py-2 sticky top-14 z-10">
            <span className="flex items-center gap-2 bg-[#8B1A1A] text-white px-4 py-1.5 rounded-xl text-sm font-semibold shadow-sm shadow-red-200">
              <span className="inline-block"><svg width="14" height="14" fill="none" viewBox="0 0 20 20"><path fill="#fff" d="M4.5 3A2.5 2.5 0 0 0 2 5.5v9A2.5 2.5 0 0 0 4.5 17h11a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 15.5 3h-11ZM4 5.5A.5.5 0 0 1 4.5 5h11a.5.5 0 0 1 .5.5V7H4V5.5ZM4 9h12v5.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V9Z"/></svg></span>
              {selectedSubject}
            </span>
          </div>
        )}
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
