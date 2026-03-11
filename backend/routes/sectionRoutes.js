import express from "express";
import auth from "../middleware/auth.js";
import { getSections, createSection, deleteSection } from "../controllers/sectionController.js";

const router = express.Router();

router.use(auth);
router.get("/", getSections);
router.post("/", createSection);
router.delete("/:id", deleteSection);

export default router;
