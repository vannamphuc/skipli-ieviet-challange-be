import express from "express";
import {
  getGitHubRepoInfo,
  attachGitHubInfo,
  removeGitHubAttachment,
} from "../controllers/githubController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/repo", getGitHubRepoInfo);
router.post("/:boardId/:cardId/:taskId/attach", attachGitHubInfo);
router.post("/:boardId/:cardId/:taskId/remove", removeGitHubAttachment);

export default router;
