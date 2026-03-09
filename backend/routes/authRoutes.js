import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

router.post("/register", auth, isAdmin, register);
router.post("/login", login);
router.get("/me", auth, getMe);

export default router;
