import {
  searchUsers,
  updateUser,
  getUsersByIds,
} from "../controllers/userController.js";
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/search", searchUsers);
router.post("/list", getUsersByIds);
router.put("/:id", updateUser);

export default router;
