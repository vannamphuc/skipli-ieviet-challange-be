import express from "express";
import {
  createBoard,
  getAllBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteMember,
  handleInvitation,
  getInvitations,
} from "../controllers/boardController.js";
import {
  getAllCards,
  createCard,
  getCardById,
  updateCard,
  deleteCard,
} from "../controllers/cardController.js";
import {
  getAllTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  assignMemberToTask,
  getAssignedMembers,
  removeMemberAssignment,
  moveTask,
} from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Board routes
router.post("/", createBoard);
router.get("/", getAllBoards);
router.get("/invitations", getInvitations);
router.post("/invitations/handle", handleInvitation);
router.get("/:id", getBoardById);
router.put("/:id", updateBoard);
router.delete("/:id", deleteBoard);
router.post("/:boardId/invite", inviteMember);

// Card routes within a board
router.get("/:boardId/cards", getAllCards);
router.post("/:boardId/cards", createCard);
router.get("/:boardId/cards/:id", getCardById);
router.put("/:boardId/cards/:id", updateCard);
router.delete("/:boardId/cards/:id", deleteCard);

// Task routes within a card
router.get("/:boardId/cards/:cardId/tasks", getAllTasks);
router.post("/:boardId/cards/:cardId/tasks", createTask);
router.get("/:boardId/cards/:cardId/tasks/:taskId", getTaskById);
router.put("/:boardId/cards/:cardId/tasks/:taskId", updateTask);
router.delete("/:boardId/cards/:cardId/tasks/:taskId", deleteTask);
router.post("/:boardId/cards/:cardId/tasks/:taskId/assign", assignMemberToTask);
router.get("/:boardId/cards/:cardId/tasks/:taskId/assign", getAssignedMembers);
router.delete(
  "/:boardId/cards/:cardId/tasks/:taskId/assign/:memberId",
  removeMemberAssignment,
);
router.post("/:boardId/cards/:cardId/tasks/:taskId/move", moveTask);

export default router;
