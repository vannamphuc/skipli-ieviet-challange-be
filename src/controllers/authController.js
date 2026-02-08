import { db } from "../config/firebase.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.collection("otps").doc(email).set({
      otp,
      expiresAt,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Mini Trello" <no-reply@minitrello.com>',
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
    });

    res.status(200).json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, verificationCode, fullname } = req.body;

  if (!email || !verificationCode) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  try {
    const otpDoc = await db.collection("otps").doc(email).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const { otp, expiresAt } = otpDoc.data();

    if (Date.now() > expiresAt || otp !== verificationCode) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    await db.collection("otps").doc(email).delete();

    let userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    let userData;

    if (userSnapshot.empty) {
      const newUser = await db.collection("users").add({
        email,
        fullname: fullname || "",
        createdAt: new Date().toISOString(),
      });
      userData = { id: newUser.id, email, fullname: fullname || "" };
    } else {
      const userDoc = userSnapshot.docs[0];
      userData = { id: userDoc.id, ...userDoc.data() };
    }

    const token = jwt.sign(
      { id: userData.id, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Authentication successful",
      accessToken: token,
      user: userData,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

export const githubCallback = async (req, res) => {
  try {
    const user = req.user;
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/?token=${token}`);
  } catch (error) {
    console.error("Error in GitHub callback:", error);
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=auth_failed`,
    );
  }
};

export const getProfile = async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(userDoc.data());
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
