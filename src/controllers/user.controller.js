import Submission from "../models/Submission.js";
import User from "../models/User.js";
import cache from "../services/cache.js";
import { sanitize } from "../utils.js";

const getAll = async (req, res) => {
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;

  const key = `users:${limit}:${page}`;

  try {
    if (req.headers["Cache-Control"] !== "no-cache") {
      const cachedUsers = await cache.get(key);
      if (cachedUsers) {
        return res.status(200).json(JSON.parse(cachedUsers));
      }
    }

    const users = await User.find().limit(limit).skip((page - 1) * limit);
    await cache.set(key, JSON.stringify(users), "EX", 600);

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getById = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const key = `user:${id}`;

  try {
    if (req.headers["Cache-Control"] !== "no-cache") {
      const cachedUser = await cache.get(key);
      if (cachedUser) {
        return res.status(200).json(JSON.parse(cachedUser));
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await cache.set(key, JSON.stringify(user), "EX", 600);

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getProfile = async (req, res) => {
  const id = req.user.sub;
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const key = `user:${id}`;

  try {
    if (req.headers["Cache-Control"] !== "no-cache") {
      const cachedUser = await cache.get(key);
      if (cachedUser) {
        return res.status(200).json(JSON.parse(cachedUser));
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await cache.set(key, JSON.stringify(user), "EX", 600);

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const update = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id || !req.user) {
    return res.status(401).json({ message: "Missing path id or user credentials" });
  }

  if (req.user.sub !== id && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { name, avatar } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = sanitize(name, "string");
    if (avatar) user.avatar = sanitize(avatar, "url");

    await user.save();

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getSubmissionHistory = async (req, res) => {
  const id = req.user.sub;
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;
  const problem = sanitize(req.query.problem, "mongo");

  if (!id) {
    return res.status(401).json({ message: "Missing user credentials" });
  }

  const key = `user_submissions:${id}:${problem ? problem : "*"}:${limit}:${page}`;

  try {
    if (req.headers["Cache-Control"] !== "no-cache") {
      const cachedSubmissions = await cache.get(key);
      if (cachedSubmissions) {
        return res.status(200).json(JSON.parse(cachedSubmissions));
      }
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const query = {
      user: id,
      ...(problem && { problem }),
    }

    const submissions = await Submission.find(query).limit(limit).skip((page - 1) * limit);
    await cache.set(key, JSON.stringify(submissions), "EX", 600);

    return res.status(200).json(submissions);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

const userController = {
  getAll,
  getById,
  getProfile,
  update,
  getSubmissionHistory,
};

export default userController;


