import Submission from "../models/Submission.js";
import User from "../models/User.js";
import Todo from "../models/Todo.js";
import cache from "../services/cache.js";
import { sanitize } from "../utils.js";
import cloudinary from "../services/image.js";
import Discussion from "../models/Discussion.js";
import Problem from "../models/Problem.js";

const getAll = async (req, res) => {
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;

  const key = `users:${limit}:${page}`;

  try {
    if (req.headers["cache-control"] !== "no-cache") {
      const cachedUsers = await cache.get(key);
      if (cachedUsers) {
        return res.status(200).json(JSON.parse(cachedUsers));
      }
    }

    const [count, users] = await Promise.all([
      User.countDocuments(),
      User.find().limit(limit).skip(limit * (page - 1))
    ]);

    const response = {
      maxPage: Math.ceil(count / limit),
      data: users,
    };

    await cache.set(key, JSON.stringify(response), "EX", 600);

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const key = `user:${id}`;

  try {
    if (req.headers["cache-control"] !== "no-cache") {
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
};

const getProfile = async (req, res) => {
  const id = req.user.sub;
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const key = `user:${id}`;

  try {
    if (req.headers["cache-control"] !== "no-cache") {
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
};

const update = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id || !req.user) {
    return res.status(401).json({ message: "Missing path id or user credentials" });
  }

  if (req.user.sub !== id && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { name, avatar } = req.body;
  const file = req.file;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = sanitize(name, "string");

    if (avatar && file) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    if (avatar) user.avatar = sanitize(avatar, "url");

    if (file) {
      const base64 = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64}`;

      cloudinary.uploader.upload(dataUri, {
        folder: 'avatars',
        public_id: `lbuser_${req.user.sub}`,
        overwrite: true,
        invalidate: true,
      });

      user.avatar = `https://res.cloudinary.com/${process.env.CLOUDINARY_NAME}/image/upload/avatars/lbuser_${req.user.sub}.jpg`;
    }

    await user.save();

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
    if (req.headers["cache-control"] !== "no-cache") {
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
    };

    const submissions = await Submission.find(query).limit(limit).skip((page - 1) * limit);
    await cache.set(key, JSON.stringify(submissions), "EX", 600);

    return res.status(200).json(submissions);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getTodoList = async (req, res) => {
  const id = req.user.sub;
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;

  if (!id) {
    return res.status(401).json({ message: "Missing user credentials" });
  }

  try {
    const [count, todos] = await Promise.all([
      Todo.countDocuments({ user: id }),
      Todo.find({ user: id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(limit * (page - 1))
        .select("problem")
    ]);

    const problems = todos
      .map(todo => todo.problem?.toString())
      .filter(Boolean);

    const problemList = await Problem.find({ _id: { $in: problems } }).select("-description");

    const interacted = await Submission.find(
      { user: req.user.sub, problem: { $in: problemList.map((p) => p._id) } },
      { problem: 1, status: 1 }
    );

    const solvedIds = new Set(interacted.filter((s) => s.status === "ACCEPTED").map((s) => s.problem.toString()));
    const interactedIds = new Set(interacted.map((s) => s.problem.toString()));

    const problemsWithStatus = problemList.map((problem) => {
      return {
        ...problem.toObject(),
        status: solvedIds.has(problem._id.toString()) ? "SOLVED" : interactedIds.has(problem._id.toString()) ? "ATTEMPTED" : "UNSOLVED",
      };
    });

    return res.status(200).json({
      maxPage: Math.ceil(count / limit),
      data: problemsWithStatus,
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const addProblemsToTodo = async (req, res) => {
  const id = req.user.sub;
  const problems = req.body.problems;
  if (!id) {
    return res.status(401).json({ message: "Missing user credentials" });
  }
  if (!Array.isArray(problems) || problems.length === 0) {
    return res.status(400).json({ message: "Request body must contain a non-empty problems array" });
  }
  const sanitizedProblems = problems
    .map(problem => sanitize(problem, "mongo"))
    .filter(problem => problem !== null);

  if (sanitizedProblems.length === 0) {
    return res.status(400).json({ message: "No valid problems found after sanitization" });
  }
  try {
    const operations = sanitizedProblems.map(problem => ({
      updateOne: {
        filter: { user: id, problem },
        update: {
          $setOnInsert: {
            user: id,
            problem
          }
        },
        upsert: true
      }
    }));
    await Todo.bulkWrite(operations);
    return res.status(201).json({ message: `Successfully added ${sanitizedProblems.length} problems to todo list` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const removeProblemFromTodo = async (req, res) => {
  const id = req.user.sub;
  const problem = sanitize(req.params.problem, "mongo");
  if (!id) {
    return res.status(401).json({ message: "Missing user credentials" });
  }
  if (!problem) {
    return res.status(400).json({ message: "Missing problem ID" });
  }

  try {
    const todo = await Todo.deleteMany({ user: id, problem });
    if (todo.deletedCount === 0) {
      return res.status(404).json({ message: "Todo not found" });
    }
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getDiscussions = async (req, res) => {
  const id = req.user.sub;
  const problemId = sanitize(req.query.problemId, "mongo");
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;
  if (!id) {
    return res.status(401).json({ message: "Missing user credentials" });
  }
  try {
    const [count, discussions] = await Promise.all([
      Discussion.countDocuments({
        author: id,
        ...(problemId ? { "solution.problem": problemId } : {})
      }),
      Discussion.find({
        author: id,
        ...(problemId ? { "solution.problem": problemId } : {})
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(limit * (page - 1))
        .populate("author")
        .populate("solution.problem", "-description")
    ]);

    return res.status(200).json({
      maxPage: Math.ceil(count / limit),
      data: discussions,
    });
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
  getTodoList,
  addProblemsToTodo,
  removeProblemFromTodo,
  getDiscussions
};

export default userController;
