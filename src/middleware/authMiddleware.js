import jwt from "jsonwebtoken";
import { db } from "../config/firebase.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load full user data from Firestore including GitHub token
    const userDoc = await db.collection("users").doc(decoded.id).get();

    if (!userDoc.exists) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const userData = userDoc.data();
    req.user = {
      id: decoded.id,
      email: decoded.email,
      ...userData,
      githubToken: userData.githubAccessToken // Map to githubToken for consistency
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
