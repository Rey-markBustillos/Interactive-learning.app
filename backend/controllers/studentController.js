import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";

// GET /api/students
export const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find({ owner: req.user._id }).sort({ name: 1 });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

// POST /api/students
export const createStudent = async (req, res, next) => {
  try {
    const { lrn, name, section } = req.body;

    if (!lrn || !name || !section) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const student = await Student.create({ lrn, name, section, owner: req.user._id });
    res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "LRN already exists" });
    }
    next(error);
  }
};

// GET /api/students/lrn/:lrn
export const getStudentByLrn = async (req, res, next) => {
  try {
    const student = await Student.findOne({ lrn: req.params.lrn, owner: req.user._id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
};

// POST /api/students/bulk
export const bulkCreateStudents = async (req, res, next) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "No students provided" });
    }
    const docs = students.map((s) => ({ lrn: String(s.lrn).trim(), name: String(s.name).trim(), section: String(s.section || "").trim(), owner: req.user._id }));
    let inserted = [];
    try {
      const result = await Student.insertMany(docs, { ordered: false });
      inserted = result;
    } catch (bulkErr) {
      if (bulkErr.name === "MongoBulkWriteError") {
        inserted = bulkErr.insertedDocs || [];
      } else {
        throw bulkErr;
      }
    }
    res.status(201).json({ inserted: inserted.length, skipped: docs.length - inserted.length, students: inserted });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/students/:id
export const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    // Remove all attendance tied to this student to avoid orphan records.
    await Attendance.deleteMany({ student: student._id });
    res.json({ message: "Student removed" });
  } catch (error) {
    next(error);
  }
};
