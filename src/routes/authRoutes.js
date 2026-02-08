import {
  sendOTP,
  verifyOTP,
  githubCallback,
  getProfile,
} from "../controllers/authController.js";
import passport from "passport";
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.get("/me", authMiddleware, getProfile);

router.get("/github", passport.authenticate("github", { session: false }));
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login?error=github_failed",
    session: false,
  }),
  githubCallback,
);

export default router;
