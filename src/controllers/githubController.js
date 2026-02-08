import axios from "axios";
import { db } from "../config/firebase.js";

const GITHUB_API_URL = "https://api.github.com";

export const getGitHubRepoInfo = async (req, res) => {
  const { owner, repo } = req.query; // e.g. /github/repo?owner=octocat&repo=hello-world
  const user = req.user;

  if (!user.githubAccessToken) {
    return res.status(401).json({ message: "GitHub not connected" });
  }

  try {
    const headers = {
      Authorization: `token ${user.githubAccessToken}`,
      Accept: "application/vnd.github.v3+json",
    };

    // Parallel fetch PRs, Commits, and Issues
    const [prs, commits, issues] = await Promise.all([
      axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`, { headers }),
      axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits`, {
        headers,
      }),
      axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/issues`, { headers }),
    ]);

    res.status(200).json({
      pullRequests: prs.data.slice(0, 10),
      commits: commits.data.slice(0, 10),
      issues: issues.data.filter((i) => !i.pull_request).slice(0, 10),
    });
  } catch (error) {
    console.error(
      "Error fetching GitHub info:",
      error.response?.data || error.message,
    );
    res
      .status(error.response?.status || 500)
      .json({ message: "Failed to fetch GitHub info" });
  }
};

export const attachGitHubInfo = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;
  const { type, data } = req.body; // type: 'pr' | 'commit' | 'issue', data: { id, url, title, etc }
  const userId = req.user.id;

  try {
    // Verify task existence and ownership/membership
    const taskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Add attachment to task metadata
    const existingAttachments = taskDoc.data().githubAttachments || [];
    const newAttachment = {
      type,
      ...data,
      attachedAt: new Date().toISOString(),
      attachedBy: userId,
    };

    await taskRef.update({
      githubAttachments: [...existingAttachments, newAttachment],
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json(newAttachment);
  } catch (error) {
    console.error("Error attaching GitHub info:", error);
    res.status(500).json({ message: "Failed to attach GitHub info" });
  }
};

export const removeGitHubAttachment = async (req, res) => {
  const { boardId, cardId, taskId } = req.params;
  const { attachmentId } = req.body;

  try {
    const taskRef = db
      .collection("boards")
      .doc(boardId)
      .collection("cards")
      .doc(cardId)
      .collection("tasks")
      .doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ message: "Task not found" });
    }

    const githubAttachments = taskDoc.data().githubAttachments || [];
    const updatedAttachments = githubAttachments.filter(
      (a) => a.id !== attachmentId && a.sha !== attachmentId,
    );

    await taskRef.update({
      githubAttachments: updatedAttachments,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error removing GitHub attachment:", error);
    res.status(500).json({ message: "Failed to remove GitHub attachment" });
  }
};
