import Discussion from "../models/Discussion.js";
import Vote from "../models/Vote.js";
import cache from "../services/cache.js";
import { sanitize } from "../utils.js";

const getAll = async (req, res) => {
  const limit = sanitize(req.query.limit) || 10;
  const page = sanitize(req.query.page) || 1;

  const key = `discussions:${limit}:${page}`;

  try {
    if (req.headers["cache-control"] === "no-cache") {
      const cachedDiscussions = await cache.get("discussions");
      if (cachedDiscussions) {
        return res.status(200).json(JSON.parse(cachedDiscussions));
      }
    }

    const [count, discussions] = await Promise.all([
      Discussion.countDocuments(),
      Discussion.find().limit(limit).skip(limit * (page - 1))
    ]);

    const response = {
      maxPage: Math.ceil(count / limit),
      data: discussions,
    };

    await cache.set(key, JSON.stringify(response), "EX", 600);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  try {
    const discussion = await Discussion.findById(id)
      .populate("author")
      .populate({
        path: "comments",
        populate: [
          { path: "author" },
        ]
      });
    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found" });
    }

    res.status(200).json(discussion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const create = async (req, res) => {
  const { title, content, tags } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    const discussion = await Discussion.create({ title, content, tags, author: req.user.sub });
    res.status(201).json({ message: "Discussion created" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const update = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  try {
    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found" });
    }

    if (discussion.author.toString() !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { title, content, tags } = req.body;
    const isClosed = sanitize(req.body.isClosed, "boolean");
    const isAuthorAnonymous = sanitize(req.body.isAuthorAnonymous, "boolean");

    if (title) discussion.title = title;
    if (content) discussion.content = content;
    if (tags) discussion.tags = tags;
    if (isClosed) discussion.isClosed = isClosed;

    await discussion.save();
    res.status(200).json(discussion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  try {
    const discussion = await Discussion.findById(id);

    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found" });
    }

    if (discussion.author.toString() !== req.user.sub && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    await discussion.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const search = async (req, res) => {
  const term = sanitize(req.query.term, "string");
  if (!term) {
    return res.status(400).send({ message: "Invalid search term" });
  }

  const key = `discussions_search:${term}`;

  if (req.headers["cache-control"] !== "no-cache") {
    const cached = await cache.get(key);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
  }

  const discussions = await Discussion.aggregate([
    {
      "$search": {
        "index": "discussionsIdx",
        "text": {
          "query": term,
          "path": ["title", "content"],
          "fuzzy": {}
        }
      }
    }
  ]);

  if (!discussions) {
    return res.status(404).send({ message: "No discussions found" });
  }

  await cache.set(key, JSON.stringify(discussions), "EX", 600);
  return res.status(200).send(discussions);
};

const vote = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const action = req.query.action;
  if (!["upvote", "downvote"].includes(action)) {
    return res.status(400).json({ message: "Invalid vote type" });
  }

  try {
    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (discussion.author.toString() === req.user.sub) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const existingVote = await Vote.findOne({ userId: req.user.sub, nodeType: "discussion", nodeId: id });

    if (existingVote) {
      if (existingVote.vote === action) {
        await existingVote.deleteOne();
        action === "upvote" ? discussion.upvotes-- : discussion.downvotes--;
      } else {
        if (existingVote.vote === "upvote") {
          discussion.upvotes--;
          discussion.downvotes++;
        } else {
          discussion.downvotes--;
          discussion.upvotes++;
        }
        existingVote.vote = action;
        await existingVote.save();
      }
    } else {
      await Vote.create({ userId: req.user.sub, nodeType: "discussion", nodeId: id, vote: action });
      action === "upvote" ? discussion.upvotes++ : discussion.downvotes++;
    }

    await discussion.save();
    res.status(200).json({ message: "Vote recorded", upvotes: discussion.upvotes, downvotes: discussion.downvotes });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const discussionController = {
  getAll,
  getById,
  create,
  update,
  remove,
  search,
  vote,
};

export default discussionController;
