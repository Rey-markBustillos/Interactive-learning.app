import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    lrn: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// LRN must be unique per user (not globally)
studentSchema.index({ lrn: 1, owner: 1 }, { unique: true });

const Student = mongoose.model("Student", studentSchema);
export default Student;
