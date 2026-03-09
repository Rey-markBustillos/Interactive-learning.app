import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    timeIn: { type: String, required: true },
    status: { type: String, enum: ["Present", "Late"], default: "Present" },
  },
  { timestamps: true }
);

// One attendance record per student per day per user
attendanceSchema.index({ student: 1, date: 1, owner: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
