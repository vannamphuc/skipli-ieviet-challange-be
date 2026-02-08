import { db } from "../config/firebase.js";

// Retrieve All Tasks of a card
export const getAllTasks = async (req, res) => {
  const { boardId, cardId } = req.params;

  try {
    const snapshot = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .orderBy("createdAt", "asc")
      .get();

    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      cardId,
      ...doc.data(),
    }));

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

// Create a New Task within a card
export const createTask = async (req, res) => {
  const { boardId, cardId } = req.params;
  const { title, description, status, priority, deadline } = req.body;
  const userId = req.user.id;

  if (!title) {
    return res.status(400).json({ message: "Task title is required" });
  }

  try {
    const taskData = {
      title,
      description: description || "",
      status: status || "backlog",
      priority: priority || "medium",
      deadline: deadline || null,
      ownerId: userId,
      cardId,
      boardId,
      assignedMembers: [],
      githubAttachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .add(taskData);

    res.status(201).json({ id: docRef.id, ...taskData });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
};

// Retrieve Task Details
export const getTaskById = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;

  try {
    const doc = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching task details:", error);
    res.status(500).json({ message: "Failed to fetch task details" });
  }
};

// Update Task Details
export const updateTask = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;
  const updates = req.body;

  try {
    const taskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const doc = await taskRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    const taskUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await taskRef.update(taskUpdates);
    res.status(200).json({ id: taskId, ...doc.data(), ...taskUpdates });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
};

// Delete a Task
export const deleteTask = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;

  try {
    const taskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const doc = await taskRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    await taskRef.delete();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
};

// Assign Member to a Task
export const assignMemberToTask = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ message: "Member ID is required" });
  }

  try {
    const taskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const doc = await taskRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    const { assignedMembers } = doc.data();
    if (!assignedMembers.includes(memberId)) {
      await taskRef.update({
        assignedMembers: [...assignedMembers, memberId],
        updatedAt: new Date().toISOString(),
      });
    }

    res.status(201).json({ taskId, memberId });
  } catch (error) {
    console.error("Error assigning member:", error);
    res.status(500).json({ message: "Failed to assign member" });
  }
};

// Retrieve Assigned Members of a Task
export const getAssignedMembers = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;

  try {
    const doc = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    const { assignedMembers } = doc.data();
    const result = assignedMembers.map((mId) => ({ taskId, memberId: mId }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching assigned members:", error);
    res.status(500).json({ message: "Failed to fetch assigned members" });
  }
};

// Remove Member Assignment
export const removeMemberAssignment = async (req, res) => {
  const { boardId, cardId, taskId, memberId } = req.params;

  try {
    const taskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const doc = await taskRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    const { assignedMembers } = doc.data();
    const newAssignedMembers = assignedMembers.filter(
      (mId) => mId !== memberId,
    );

    await taskRef.update({
      assignedMembers: newAssignedMembers,
      updatedAt: new Date().toISOString(),
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error removing member assignment:", error);
    res.status(500).json({ message: "Failed to remove member assignment" });
  }
};

// Move Task (Cross-card or reorder)
export const moveTask = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;
  const { newCardId, newIndex } = req.body;

  try {
    const oldTaskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const doc = await oldTaskRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    const taskData = doc.data();

    // If moving to a different card
    if (newCardId && newCardId !== cardId) {
      const newTaskRef = db
        .collection("boards")
        .doc(boardId)
        .collection("cards")
        .doc(newCardId)
        .collection("tasks")
        .doc(taskId);

      await newTaskRef.set({
        ...taskData,
        cardId: newCardId,
        updatedAt: new Date().toISOString(),
      });

      await oldTaskRef.delete();
    } else {
      // Reordering in same card - we just update timestamps or an explicit index if we had one
      await oldTaskRef.update({
        updatedAt: new Date().toISOString(),
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error moving task:", error);
    res.status(500).json({ message: "Failed to move task" });
  }
};
