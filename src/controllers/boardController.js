import { db } from "../config/firebase.js";

//  Create a New Board
export const createBoard = async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: "Board name is required" });
  }

  try {
    const boardData = {
      name,
      description: description || "",
      ownerId: userId,
      members: [userId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("boards").add(boardData);
    res.status(201).json({ id: docRef.id, ...boardData });
  } catch (error) {
    console.error("Error creating board:", error);
    res.status(500).json({ message: "Failed to create board" });
  }
};

// Retrieve All Boards associated with the authenticated user
export const getAllBoards = async (req, res) => {
  const userId = req.user.id;

  try {
    const snapshot = await db
      .collection("boards")
      .where("members", "array-contains", userId)
      .get();

    const boards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(boards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    res.status(500).json({ message: "Failed to fetch boards" });
  }
};

// Retrieve Board Details
export const getBoardById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const doc = await db.collection("boards").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Board not found" });
    }

    const board = doc.data();
    if (!board.members.includes(userId)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not a member of this board" });
    }

    res.status(200).json({ id: doc.id, ...board });
  } catch (error) {
    console.error("Error fetching board details:", error);
    res.status(500).json({ message: "Failed to fetch board details" });
  }
};

// Update Board Details
export const updateBoard = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id;

  try {
    const boardRef = db.collection("boards").doc(id);
    const doc = await boardRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (doc.data().ownerId !== userId) {
      return res.status(403).json({
        message: "Forbidden: Only the owner can update board details",
      });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    await boardRef.update(updates);
    res.status(200).json({ id, ...doc.data(), ...updates });
  } catch (error) {
    console.error("Error updating board:", error);
    res.status(500).json({ message: "Failed to update board" });
  }
};

// Delete Board
export const deleteBoard = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const boardRef = db.collection("boards").doc(id);
    const doc = await boardRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (doc.data().ownerId !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Only the owner can delete the board" });
    }

    await boardRef.delete();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting board:", error);
    res.status(500).json({ message: "Failed to delete board" });
  }
};

// Invite people to a board
export const inviteMember = async (req, res) => {
  const { boardId } = req.params;
  const { memberId, email_member } = req.body;
  const userId = req.user.id;

  try {
    const boardRef = db.collection("boards").doc(boardId);
    const boardDoc = await boardRef.get();

    if (!boardDoc.exists) {
      return res.status(404).json({ message: "Board not found" });
    }

    const { members, ownerId } = boardDoc.data();
    if (ownerId !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Only the owner can invite members" });
    }

    // Check if already a member
    if (members.includes(memberId)) {
      return res
        .status(400)
        .json({ message: "User is already a member of this board" });
    }

    const inviteData = {
      boardId,
      boardName: boardDoc.data().name,
      boardOwnerId: userId,
      memberId,
      emailMember: email_member,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const inviteRef = await db.collection("invitations").add(inviteData);

    // Notify via socket if member is online (optional, handled via client refresh usually)
    const io = req.app.get("io");
    if (io) {
      io.to(boardId).emit("invitation-sent", {
        inviteId: inviteRef.id,
        memberId,
      });
    }

    res.status(200).json({ success: true, inviteId: inviteRef.id });
  } catch (error) {
    console.error("Error inviting member:", error);
    res.status(500).json({ message: "Failed to send invitation" });
  }
};

// Accept/Decline invitation
export const handleInvitation = async (req, res) => {
  const { inviteId, status } = req.body; // status: 'accepted' or 'declined'
  const userId = req.user.id;

  if (!["accepted", "declined"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const inviteRef = db.collection("invitations").doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const inviteData = inviteDoc.data();
    if (inviteData.memberId !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: This invitation is not for you" });
    }

    if (status === "accepted") {
      const boardRef = db.collection("boards").doc(inviteData.boardId);
      const boardDoc = await boardRef.get();

      if (boardDoc.exists) {
        const { members } = boardDoc.data();
        if (!members.includes(userId)) {
          await boardRef.update({
            members: [...members, userId],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    await inviteRef.update({ status, updatedAt: new Date().toISOString() });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling invitation:", error);
    res.status(500).json({ message: "Failed to handle invitation" });
  }
};

export const getInvitations = async (req, res) => {
  const userId = req.user.id;
  try {
    const snapshot = await db
      .collection("invitations")
      .where("memberId", "==", userId)
      .where("status", "==", "pending")
      .get();

    const invitations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
};
