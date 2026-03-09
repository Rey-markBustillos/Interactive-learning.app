import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";

// POST /api/attendance
export const markAttendance = async (req, res, next) => {
  try {
    const { lrn, date: clientDate } = req.body;

    if (!lrn) {
      return res.status(400).json({ message: "LRN is required" });
    }

    const student = await Student.findOne({ lrn, owner: req.user._id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Use the client's local date if provided (avoids UTC timezone mismatch for PH users)
    const today = clientDate || new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const now = new Date();
    // Render runs in UTC — compute Philippine time (UTC+8) for correct timeIn and Late check
    const phHour = (now.getUTCHours() + 8) % 24;
    const phMin = now.getUTCMinutes();
    const timeIn = `${String(phHour % 12 || 12).padStart(2, '0')}:${String(phMin).padStart(2, '0')} ${phHour < 12 ? 'AM' : 'PM'}`;
    const isLate = phHour > 7 || (phHour === 7 && phMin > 40);
    const status = isLate ? "Late" : "Present";

    // Check if already marked today
    const existing = await Attendance.findOne({ student: student._id, date: today, owner: req.user._id });
    if (existing) {
      return res.status(400).json({
        message: `${student.name} is already marked present today`,
        student,
      });
    }

    const attendance = await Attendance.create({
      student: student._id,
      owner: req.user._id,
      date: today,
      timeIn,
      status,
    });

    const populated = await attendance.populate("student");

    res.status(201).json({
      _id: populated._id,
      studentId: student.studentId,
      lrn: student.lrn,
      name: student.name,
      date: populated.date,
      timeIn: populated.timeIn,
      status: populated.status,
      status: populated.status,
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
      lrn: r.student.lrn,
      name: r.student.name,
      date: r.date,
      timeIn: r.timeIn,
      status: r.status,
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
      studentId: r.student.studentId,
      lrn: r.student.lrn,
      name: r.student.name,
      date: r.date,
      timeIn: r.timeIn,
      status: r.status,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};
