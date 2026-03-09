import express from "express";
import { markAttendance, getAttendance, getAllAttendance } from "../controllers/attendanceController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth); // All attendance routes require authentication

router.post("/", markAttendance);
router.get("/all", getAllAttendance);
router.get("/", getAttendance);

export default router;
