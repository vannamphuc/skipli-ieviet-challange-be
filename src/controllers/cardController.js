import { db } from "../config/firebase.js";

// Retrieve All Cards associated with a board
export const getAllCards = async (req, res) => {
  const { boardId } = req.params;

  try {
    const snapshot = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .orderBy("createdAt", "asc")
      .get();

    const cards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(cards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ message: "Failed to fetch cards" });
  }
};

// Create a New Card (Column/List)
export const createCard = async (req, res) => {
  const { boardId } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Card name is required" });
  }

  try {
    const cardData = {
      name,
      description: description || "",
      boardId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .add(cardData);

    res.status(201).json({ id: docRef.id, ...cardData });
  } catch (error) {
    console.error("Error creating card:", error);
    res.status(500).json({ message: "Failed to create card" });
  }
};

// Retrieve Card Details
export const getCardById = async (req, res) => {
  const { boardId, id } = req.params;

  try {
    const doc = await db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Card not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching card details:", error);
    res.status(500).json({ message: "Failed to fetch card details" });
  }
};

// Update Card Details
export const updateCard = async (req, res) => {
  const { boardId, id } = req.params;
  const { name, description } = req.body;

  try {
    const cardRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(id);

    const doc = await cardRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Card not found" });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    await cardRef.update(updates);
    res.status(200).json({ id, ...doc.data(), ...updates });
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({ message: "Failed to update card" });
  }
};

// Delete Card
export const deleteCard = async (req, res) => {
  const { boardId, id } = req.params;

  try {
    const cardRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(id);

    const doc = await cardRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Card not found" });
    }

    await cardRef.delete();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({ message: "Failed to delete card" });
  }
};
