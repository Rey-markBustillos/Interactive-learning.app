import { useState, useRef, useCallback, useEffect } from "react";
import Swal from 'sweetalert2';
import { FaSignOutAlt, FaUsers, FaTimes, FaLock, FaEnvelope, FaShieldAlt } from "react-icons/fa";
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

  //  Admin / User List
  const [adminModal, setAdminModal] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ email: "", password: "" });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [userListModal, setUserListModal] = useState(false);
  const [userListData, setUserListData] = useState([]);
  const [adminToken, setAdminToken] = useState("");

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Tokenize OCR text into words (letter-normalized)
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

  //  Admin auth + user list handler
  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError("");
    try {
      // Step 1: Login with provided credentials
      const loginRes = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminCreds.email, password: adminCreds.password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) { setAdminError(loginData.message || "Invalid credentials"); setAdminLoading(false); return; }
      if (loginData.role !== "admin") { setAdminError("Access denied. Admin account required."); setAdminLoading(false); return; }

      // Step 2: Fetch user list with admin token
      const usersRes = await fetch(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${loginData.token}` },
      });
      const usersData = await usersRes.json();
      if (!usersRes.ok) { setAdminError(usersData.message || "Failed to load users"); setAdminLoading(false); return; }

      setUserListData(usersData);
      setAdminToken(loginData.token);
      setAdminModal(false);
      setUserListModal(true);
      setAdminCreds({ email: "", password: "" });
    } catch {
      setAdminError("Connection error. Please try again.");
    }
    setAdminLoading(false);
  };

  const handleDeleteUser = async (user) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete User?",
      html: `Are you sure you want to delete <strong>${user.name}</strong>?<br/><span style="font-size:13px;color:#6b7280">${user.email}</span>`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`${API}/auth/users/${user._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) { Swal.fire({ icon: "error", title: "Error", text: data.message || "Failed to delete user", confirmButtonColor: "#8B1A1A" }); return; }
      setUserListData((prev) => prev.filter((u) => u._id !== user._id));
      Swal.fire({ icon: "success", title: "Deleted!", text: `${user.name} has been removed.`, confirmButtonColor: "#1565C0", timer: 1800, timerProgressBar: true, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Connection Error", text: "Could not reach the server.", confirmButtonColor: "#8B1A1A" });
    }
  };

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
    <>
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
          <div className="flex items-center gap-2">
            {/* User List button */}
            <button
              onClick={() => { setAdminError(""); setAdminCreds({ email: "", password: "" }); setAdminModal(true); }}
              className="group flex items-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-200 hover:border-blue-600 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-blue-200"
            >
              <FaUsers size={13} />
              <span className="hidden sm:inline">User List</span>
            </button>
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
          </div>
        </nav>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {renderPage()}
        </main>
      </div>
    </div>

    {/* ── ADMIN AUTH MODAL ── */}
    {adminModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAdminModal(false)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-linear-to-r from-[#1565C0] to-[#0D47A1] px-6 py-5 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl"><FaShieldAlt size={18} /></div>
              <div>
                <h2 className="font-bold text-base">Admin Verification</h2>
                <p className="text-blue-200 text-xs">Enter admin credentials to continue</p>
              </div>
            </div>
            <button onClick={() => setAdminModal(false)} className="text-white/70 hover:text-white cursor-pointer"><FaTimes size={16} /></button>
          </div>

          <form onSubmit={handleAdminAuth} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Admin Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="email"
                  required
                  autoFocus
                  value={adminCreds.email}
                  onChange={(e) => setAdminCreds((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Admin@jcp.edu.ph"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="password"
                  required
                  value={adminCreds.password}
                  onChange={(e) => setAdminCreds((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                />
              </div>
            </div>
            {adminError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{adminError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAdminModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
              <button
                type="submit"
                disabled={adminLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#1565C0] hover:bg-[#0D47A1] disabled:bg-blue-300 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {adminLoading ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Verifying...</> : <><FaShieldAlt size={13} /> Verify & View</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ── USER LIST MODAL ── */}
    {userListModal && (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-linear-to-r from-[#1565C0] to-[#0D47A1] px-6 py-5 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl"><FaUsers size={18} /></div>
              <div>
                <h2 className="font-bold text-lg">All Users</h2>
                <p className="text-blue-200 text-xs">{userListData.length} registered user{userListData.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <button onClick={() => setUserListModal(false)} className="text-white/70 hover:text-white cursor-pointer"><FaTimes size={18} /></button>
          </div>

          {/* Table */}
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold">#</th>
                  <th className="px-5 py-3 text-left font-semibold">Name</th>
                  <th className="px-5 py-3 text-left font-semibold">Email</th>
                  <th className="px-5 py-3 text-left font-semibold">Role</th>
                  <th className="px-5 py-3 text-left font-semibold">Joined</th>
                  <th className="px-5 py-3 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userListData.map((u, i) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#1565C0] to-[#0D47A1] flex items-center justify-center text-white font-bold text-xs shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                        <span className="text-gray-800 font-semibold">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs font-mono">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ u.role === "admin" ? "bg-purple-50 text-purple-600 border border-purple-200" : "bg-blue-50 text-blue-600 border border-blue-200" }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td className="px-5 py-3 text-center">
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white border border-red-200 hover:border-red-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          <FaTimes size={10} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

export default Dashboard;
