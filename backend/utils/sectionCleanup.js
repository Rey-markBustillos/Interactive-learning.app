import Student from "../models/Student.js";
import Section from "../models/Section.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function cleanupSectionIfEmpty(sectionName) {
  const normalized = String(sectionName || "").trim();
  if (!normalized) return;

  const hasStudents = await Student.exists({
    section: new RegExp(`^${escapeRegex(normalized)}$`, "i"),
  });

  if (!hasStudents) {
    await Section.deleteMany({
      name: new RegExp(`^${escapeRegex(normalized)}$`, "i"),
    });
  }
}

export async function cleanupAllOrphanSections() {
  const sections = await Section.find({}).select("name");

  await Promise.all(
    sections.map((section) => cleanupSectionIfEmpty(section.name))
  );
}
