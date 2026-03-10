import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import mongoose from "mongoose";

dotenv.config();

// Drop old conflicting indexes then start the server
const runMigrations = async () => {
  try {
    const db = mongoose.connection.db;

    // Drop old lrn_1 unique index (replaced by compound lrn+owner index)
    const studentColl = db.collection("students");
    const studentIndexes = await studentColl.indexes();
    if (studentIndexes.some((i) => i.name === "lrn_1")) {
      await studentColl.dropIndex("lrn_1");
      console.log("Dropped old students lrn_1 index");
    }

    // Drop old student_1_date_1 unique index (replaced by student+date+owner index)
    const attendanceColl = db.collection("attendances");
    const attendanceIndexes = await attendanceColl.indexes();
    if (attendanceIndexes.some((i) => i.name === "student_1_date_1")) {
      await attendanceColl.dropIndex("student_1_date_1");
      console.log("Dropped old attendances student_1_date_1 index");
    }
  } catch (err) {
    // Collections may not exist yet on first run — that's fine
    if (err.code !== 26) console.warn("Migration warning:", err.message);
  }
};

// Ensure the admin account exists
const seedAdmin = async () => {
  try {
    const { default: User } = await import("./models/User.js");
    const exists = await User.findOne({ email: "admin@jcp.edu.ph" });
    if (!exists) {
      await User.create({
        name: "Admin",
        email: "admin@jcp.edu.ph",
        password: "Admin123456789",
        role: "admin",
      });
      console.log("Admin account created");
    } else if (exists.role !== "admin") {
      exists.role = "admin";
      await exists.save();
      console.log("Admin role assigned to existing account");
    }
  } catch (err) {
    console.warn("Admin seed warning:", err.message);
  }
};

connectDB().then(runMigrations).then(seedAdmin);

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://scan-to-track.netlify.app",
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

// Public: look up a student's attendance by LRN (no auth required)
app.get("/api/public/track", async (req, res) => {
  try {
    const { default: Student } = await import("./models/Student.js");
    const { default: Attendance } = await import("./models/Attendance.js");
    const { default: User } = await import("./models/User.js");
    const lrn = (req.query.lrn || "").trim();
    if (!lrn) return res.status(400).json({ message: "LRN is required." });
    const students = await Student.find({ lrn }).select("_id name lrn section owner");
    if (!students.length) return res.status(404).json({ message: "No student found with that LRN." });

    const studentIds = students.map((s) => s._id);
    const ownerIds = [...new Set(students.map((s) => String(s.owner)))];

    const owners = await User.find({ _id: { $in: ownerIds } }).select("_id name subjects");
    const ownerMap = Object.fromEntries(
      owners.map((o) => [String(o._id), { name: o.name, subjects: o.subjects || [] }])
    );

    const records = await Attendance.find({ student: { $in: studentIds } })
      .select("student owner subject date timeIn status")
      .sort({ date: -1, timeIn: -1 });

    // key: ownerId::subject
    const bucket = {};

    const pushBucket = (ownerId, subject, rec) => {
      const key = `${ownerId}::${subject}`;
      if (!bucket[key]) {
        bucket[key] = {
          ownerId,
          teacher: ownerMap[ownerId]?.name || "Unknown Teacher",
          subject,
          present: 0,
          late: 0,
          total: 0,
          records: [],
        };
      }
      bucket[key].records.push(rec);
      bucket[key].total += 1;
      if (rec.status === "Late") bucket[key].late += 1;
      else bucket[key].present += 1;
    };

    // Pre-populate owner subjects so each teacher's subject appears even with zero records
    ownerIds.forEach((oid) => {
      const subs = (ownerMap[oid]?.subjects || []).filter(Boolean);
      subs.forEach((s) => {
        const key = `${oid}::${s}`;
        if (!bucket[key]) {
          bucket[key] = {
            ownerId: oid,
            teacher: ownerMap[oid]?.name || "Unknown Teacher",
            subject: s,
            present: 0,
            late: 0,
            total: 0,
            records: [],
          };
        }
      });
    });

    records.forEach((r) => {
      const ownerId = String(r.owner || "");
      const subject = r.subject && r.subject.trim() ? r.subject.trim() : "All";
      pushBucket(ownerId, subject, {
        date: r.date,
        timeIn: r.timeIn,
        status: r.status || "Present",
      });
    });

    const subjects = Object.values(bucket)
      .map((b) => ({ ...b, records: b.records.slice(0, 30) }))
      .sort((a, b) => {
        if (a.teacher !== b.teacher) return a.teacher.localeCompare(b.teacher);
        return a.subject.localeCompare(b.subject);
      });

    const primary = students[0];

    res.json({
      name: primary.name,
      lrn: primary.lrn,
      section: primary.section,
      subjects,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Health check
app.get("/", (_req, res) => {
  res.json({ message: "Interactive Learning API is running" });
});

// Error handler
app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
