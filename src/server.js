import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";
import "./config/firebase.js";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

app.use(passport.initialize());
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-board", (boardId) => {
    socket.join(boardId);
    console.log(`User ${socket.id} joined board ${boardId}`);
  });

  socket.on("board-updated", (boardId) => {
    socket.to(boardId).emit("refresh-board");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/github", githubRoutes);

app.get("/", (req, res) => {
  res.send("Mini Trello API is running...");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
