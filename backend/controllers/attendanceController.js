import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Section from "../models/Section.js";

const TIME_24H_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function toMinutes(value) {
  const match = String(value || "").match(TIME_24H_REGEX);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTimeLabel(value) {
  const mins = toMinutes(value);
  if (mins === null) return String(value || "--");
  const h24 = Math.floor(mins / 60);
  const m = String(mins % 60).padStart(2, "0");
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m} ${suffix}`;
}

// POST /api/attendance
export const markAttendance = async (req, res, next) => {
  try {
    const { lrn, date: clientDate, subject } = req.body;

    if (!lrn) {
      return res.status(400).json({ message: "LRN is required" });
    }

    const student = await Student.findOne({ lrn, owner: req.user._id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Use the client's local date if provided (avoids UTC timezone mismatch for PH users)
    const today = clientDate || new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if already marked today for this subject.
    const existing = await Attendance.findOne({ student: student._id, date: today, owner: req.user._id, subject: subject || "" });
    if (existing) {
      return res.status(400).json({
        message: `${student.name} is already marked present today${subject ? ` for ${subject}` : ""}`,
        student,
      });
    }

    const now = new Date();
    // Render runs in UTC — compute Philippine time (UTC+8) for correct timeIn and Late check
    const phHour = (now.getUTCHours() + 8) % 24;
    const phMin = now.getUTCMinutes();
    const timeIn = `${String(phHour % 12 || 12).padStart(2, '0')}:${String(phMin).padStart(2, '0')} ${phHour < 12 ? 'AM' : 'PM'}`;

    const sectionConfig = await Section.findOne({
      name: student.section,
      assignedTeacherEmail: String(req.user.email || "").toLowerCase(),
      ...(subject ? { subject: String(subject).trim() } : {}),
    }).select("presentStart presentEnd lateStart lateEnd timeIn");

    if (!sectionConfig) {
      return res.status(400).json({
        message: "Attendance time is not configured by admin for this section/subject yet.",
      });
    }

    const nowMinutes = phHour * 60 + phMin;

    const presentStartMin = toMinutes(sectionConfig.presentStart);
    const presentEndMin = toMinutes(sectionConfig.presentEnd);
    const lateStartMin = toMinutes(sectionConfig.lateStart);
    const lateEndMin = toMinutes(sectionConfig.lateEnd);

    let status;

    if ([presentStartMin, presentEndMin, lateStartMin, lateEndMin].every((v) => v !== null)) {
      if (!(presentStartMin < presentEndMin && lateStartMin >= presentEndMin && lateStartMin < lateEndMin)) {
        return res.status(400).json({ message: "Invalid section time window configuration." });
      }

      if (nowMinutes < presentStartMin) {
        return res.status(400).json({
          message: `Scanning has not started yet. Present time starts at ${formatTimeLabel(sectionConfig.presentStart)}.`,
        });
      }

      if (nowMinutes <= presentEndMin) {
        status = "Present";
      } else if (nowMinutes < lateStartMin) {
        return res.status(400).json({
          message: `Present time ended at ${formatTimeLabel(sectionConfig.presentEnd)}. Late time starts at ${formatTimeLabel(sectionConfig.lateStart)}.`,
        });
      } else if (nowMinutes <= lateEndMin) {
        status = "Late";
      } else {
        return res.status(403).json({
          message: `Late time ended at ${formatTimeLabel(sectionConfig.lateEnd)}. Student is already absent and can no longer scan.`,
        });
      }
    } else {
      // Backward compatibility for older section config using only timeIn.
      const legacyCutoffMin = toMinutes(sectionConfig.timeIn);
      if (legacyCutoffMin === null) {
        return res.status(400).json({ message: "Invalid section time configuration." });
      }
      status = nowMinutes > legacyCutoffMin ? "Late" : "Present";
    }

    const attendance = await Attendance.create({
      student: student._id,
      owner: req.user._id,
      date: today,
      timeIn,
      status,
      subject: subject || "",
    });

    const populated = await attendance.populate("student");

    res.status(201).json({
      _id: populated._id,
      studentId: student.studentId,
      lrn: student.lrn,
      name: student.name,
      section: student.section,
      date: populated.date,
      timeIn: populated.timeIn,
      status: populated.status,
      subject: populated.subject,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/all?search=&date=&month=YYYY-MM
export const getAllAttendance = async (req, res, next) => {
  try {
    const { search, date, month } = req.query;

    // Build student filter scoped to this user
    let studentIds;
    if (search) {
      const regex = new RegExp(search, "i");
      const students = await Student.find({ owner: req.user._id, $or: [{ name: regex }, { lrn: regex }] }).select("_id");
      studentIds = students.map((s) => s._id);
      if (studentIds.length === 0) return res.json([]);
    }

    const filter = { owner: req.user._id };
    if (studentIds) filter.student = { $in: studentIds };
    if (date) filter.date = date;
    if (month) filter.date = { $regex: `^${month}` }; // YYYY-MM prefix match

    const records = await Attendance.find(filter)
      .populate("student")
      .sort({ date: -1, createdAt: -1 });

    const result = records.map((r) => ({
      _id: r._id,
      lrn: r.student?.lrn,
      name: r.student?.name,
      section: r.student?.section || "",
      date: r.date,
      timeIn: r.timeIn,
      status: r.status,
      subject: r.subject || "",
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance?date=YYYY-MM-DD
export const getAttendance = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const records = await Attendance.find({ date, owner: req.user._id })
      .populate("student")
      .sort({ createdAt: -1 });

    const result = records.map((r) => ({
      _id: r._id,
      studentId: r.student?.studentId,
      lrn: r.student?.lrn,
      name: r.student?.name,
      section: r.student?.section || "",
      date: r.date,
      timeIn: r.timeIn,
      status: r.status,
      subject: r.subject || "",
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};
