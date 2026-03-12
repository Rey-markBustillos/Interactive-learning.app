import Section from "../models/Section.js";
import User from "../models/User.js";

const SUPER_ADMIN_EMAIL = "admin@jcp.edu.ph";
const TIME_24H_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function toMinutes(value) {
  const match = String(value || "").match(TIME_24H_REGEX);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export const getSections = async (req, res, next) => {
  try {
    const userEmail = String(req.user?.email || "").toLowerCase();
    const filter = userEmail === SUPER_ADMIN_EMAIL ? {} : { assignedTeacherEmail: userEmail };
    const sections = await Section.find(filter).sort({ name: 1 });
    res.json(sections);
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req, res, next) => {
  try {
    const userEmail = (req.user?.email || "").toLowerCase();
    if (userEmail !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Only admin@jcp.edu.ph can add sections." });
    }

    const { name, assignedTeacherEmail, subject, presentStart, presentEnd, lateStart, lateEnd } = req.body;
    if (!name || !assignedTeacherEmail || !subject || !presentStart || !presentEnd || !lateStart || !lateEnd) {
      return res.status(400).json({ message: "Please fill all section fields." });
    }

    const presentStartVal = String(presentStart).trim();
    const presentEndVal = String(presentEnd).trim();
    const lateStartVal = String(lateStart).trim();
    const lateEndVal = String(lateEnd).trim();

    const presentStartMin = toMinutes(presentStartVal);
    const presentEndMin = toMinutes(presentEndVal);
    const lateStartMin = toMinutes(lateStartVal);
    const lateEndMin = toMinutes(lateEndVal);

    if ([presentStartMin, presentEndMin, lateStartMin, lateEndMin].some((v) => v === null)) {
      return res.status(400).json({ message: "Invalid time format. Use 24-hour HH:MM." });
    }
    if (presentStartMin >= presentEndMin) {
      return res.status(400).json({ message: "Present start must be earlier than present end." });
    }
    if (lateStartMin < presentEndMin) {
      return res.status(400).json({ message: "Late start must be the same as or later than present end." });
    }
    if (lateStartMin >= lateEndMin) {
      return res.status(400).json({ message: "Late start must be earlier than late end." });
    }

    const teacherEmail = String(assignedTeacherEmail).trim().toLowerCase();
    const teacher = await User.findOne({ email: teacherEmail }).select("_id name email role");
    if (!teacher || teacher.role === "admin") {
      return res.status(400).json({ message: "Assigned teacher must be a registered user account." });
    }

    const normalizedName = String(name).trim();
    const exists = await Section.findOne({ name: new RegExp(`^${normalizedName}$`, "i") });
    if (exists) {
      return res.status(400).json({ message: "Section already exists." });
    }

    const section = await Section.create({
      name: normalizedName,
      assignedTeacher: String(teacher.name || teacher.email).trim(),
      assignedTeacherEmail: teacherEmail,
      subject: String(subject).trim(),
      presentStart: presentStartVal,
      presentEnd: presentEndVal,
      lateStart: lateStartVal,
      lateEnd: lateEndVal,
      createdBy: req.user._id,
    });

    res.status(201).json(section);
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const userEmail = (req.user?.email || "").toLowerCase();
    if (userEmail !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: "Only admin@jcp.edu.ph can remove section assignments." });
    }

    const removed = await Section.findByIdAndDelete(req.params.id);
    if (!removed) {
      return res.status(404).json({ message: "Section assignment not found." });
    }

    res.json({ message: "Section assignment removed." });
  } catch (error) {
    next(error);
  }
};
