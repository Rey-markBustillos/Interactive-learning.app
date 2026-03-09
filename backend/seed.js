import dotenv from "dotenv";
import mongoose from "mongoose";
import Student from "./models/Student.js";

dotenv.config();

const students = [
  { studentId: "STU-001", lrn: "136456780001", name: "Juan Dela Cruz" },
  { studentId: "STU-002", lrn: "136456780002", name: "Maria Santos" },
  { studentId: "STU-003", lrn: "136456780003", name: "Pedro Reyes" },
  { studentId: "STU-004", lrn: "136456780004", name: "Ana Garcia" },
  { studentId: "STU-005", lrn: "136456780005", name: "Carlos Mendoza" },
  { studentId: "STU-006", lrn: "136456780006", name: "Rosa Fernandez" },
  { studentId: "STU-007", lrn: "136456780007", name: "Miguel Torres" },
  { studentId: "STU-008", lrn: "136456780008", name: "Elena Rivera" },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Student.deleteMany({});
    console.log("Cleared existing students");

    await Student.insertMany(students);
    console.log(`Seeded ${students.length} students`);

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seed();
