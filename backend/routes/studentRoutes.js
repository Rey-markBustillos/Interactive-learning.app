import express from "express";
import { getStudents, createStudent, getStudentByLrn, deleteStudent, bulkCreateStudents } from "../controllers/studentController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth); // All student routes require authentication

router.get("/", getStudents);
router.post("/", createStudent);
router.post("/bulk", bulkCreateStudents);
router.get("/lrn/:lrn", getStudentByLrn);
router.delete("/:id", deleteStudent);

export default router;
