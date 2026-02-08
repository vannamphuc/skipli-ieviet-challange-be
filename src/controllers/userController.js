import { db } from "../config/firebase.js";

// Search users by email or fullname
export const searchUsers = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    // Basic search: Find by email or fullname (case-sensitive in Firestore, usually we'd use a better search service)
    // For this challenge, we'll fetch all and filter or use multiple queries
    const snapshot = await db.collection("users").get();

    const users = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (user) =>
          user.email.toLowerCase().includes(q.toLowerCase()) ||
          (user.fullname &&
            user.fullname.toLowerCase().includes(q.toLowerCase())),
      )
      .slice(0, 10); // Limit to 10 results

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user settings
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullname, avatarUrl } = req.body;
  const userId = req.user.id;

  if (id !== userId) {
    return res
      .status(403)
      .json({ message: "Forbidden: You can only update your own profile" });
  }

  try {
    const userRef = db.collection("users").doc(id);
    const updates = {
      updatedAt: new Date().toISOString(),
    };
    if (fullname) updates.fullname = fullname;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    await userRef.update(updates);
    res.status(200).json({ id, ...updates });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// Get multiple users by IDs
export const getUsersByIds = async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(200).json([]);
  }

  try {
    // Firestore IN query limited to 10 elements usually, but for now we'll fetch and filter if needed
    // Actually whereIn is up to 30 now in some regions, let's just do a chunked fetch
    const snapshot = await db
      .collection("users")
      .where("__name__", "in", ids.slice(0, 30)) // IDs are the doc names
      .get();

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      fullname: doc.data().fullname || doc.data().email.split("@")[0],
      avatarUrl: doc.data().avatarUrl,
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};
