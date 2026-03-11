import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    assignedTeacher: { type: String, required: true, trim: true },
    assignedTeacherEmail: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    presentStart: { type: String, required: true, trim: true },
    presentEnd: { type: String, required: true, trim: true },
    lateStart: { type: String, required: true, trim: true },
    lateEnd: { type: String, required: true, trim: true },
    // Legacy fields kept optional so old records remain readable.
    timeIn: { type: String, trim: true, default: "" },
    timeOut: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

sectionSchema.index({ name: 1 }, { unique: true });

const Section = mongoose.model("Section", sectionSchema);
export default Section;
