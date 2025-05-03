import Problem from "../models/Problem.js";
import cache from "../services/cache.js";
import { sanitize } from "../utils.js";
import s3 from "../services/storage.js";
import Submission from "../models/Submission.js";
import DailyProblem from "../models/DailyProblem.js";
import Discussion from "../models/Discussion.js";
import { commentMarkers } from "../config/markers.js";
import Auth from "../models/Auth.js";
import jwt from "jsonwebtoken";

const getAll = async (req, res) => {
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;
  const auth = req.headers["authorization"] || null;

  let key = `problems:${limit}:${page}`;
  let userId = null;

  try {
    if (auth) {
      const token = auth.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        if (decoded?.sub) {
          userId = decoded.sub;
          key = `problems:${limit}:${page}:user:${userId}`;
        }
      } catch (tokenErr) {
      }
    }

    if (req.headers["cache-control"] !== "no-cache") {
      const cachedProblems = await cache.get(key);
      if (cachedProblems) {
        return res.status(200).json(JSON.parse(cachedProblems));
      }
    }

    const [count, problems] = await Promise.all([
      Problem.countDocuments(),
      Problem.find({}, { description: 0 }).limit(limit).skip((page - 1) * limit),
    ]);

    if (!userId) {
      const response = {
        maxPage: Math.ceil(count / limit),
        data: problems,
      };
      await cache.set(key, JSON.stringify(response), "EX", 600);
      return res.status(200).json(response);
    }

    const user = await Auth.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!user.isAuthenticated) {
      return res.status(401).json({ message: "User is not authenticated" });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Email is not verified" });
    }

    const interacted = await Submission.find(
      { user: userId },
      { problem: 1, status: 1 }
    );

    const solvedIds = new Set(interacted.filter((s) => s.status === "ACCEPTED").map((s) => s.problem.toString()));
    const interactedIds = new Set(interacted.map((s) => s.problem.toString()));

    const problemsWithStatus = problems.map((problem) => {
      return {
        ...problem.toObject(),
        status: solvedIds.has(problem._id.toString()) ? "SOLVED" : interactedIds.has(problem._id.toString()) ? "ATTEMPTED" : "UNSOLVED",
      };
    });

    const response = {
      maxPage: Math.ceil(count / limit),
      data: problemsWithStatus,
    };

    await cache.set(key, JSON.stringify(response), "EX", 600);
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const key = `problem:${id}`;

  try {
    if (req.headers["cache-control"] !== "no-cache") {
      const cachedProblem = await cache.get(key);
      if (cachedProblem) {
        return res.status(200).json(JSON.parse(cachedProblem));
      }
    }

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    await cache.set(key, JSON.stringify(problem), "EX", 600);

    return res.status(200).json(problem);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  const { title, description, difficulty, tags } = req.body;

  if (!title || !description || !difficulty || !tags | !Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  const existingProblem = await Problem.findOne({ title: { $eq: title } });
  if (existingProblem) {
    return res.status(409).json({ message: "Problem already exists" });
  }

  try {
    const problem = await Problem.create({
      title,
      description,
      difficulty: difficulty.toUpperCase(),
      tags,
    });
    return res.status(201).json(problem);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getFunctionDeclaration = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  const language = sanitize(req.query.language, "string");

  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  if (!language) {
    return res.status(400).json({ message: "Missing query language" });
  }

  const key = `problem:${id}:func:${language}`;

  try {
    if (req.headers["cache-control"] !== "no-cache") {
      const cachedFunc = await cache.get(key);
      if (cachedFunc) {
        return res.status(200).json(JSON.parse(cachedFunc));
      }
    }

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const func = await s3.getContent(`${id}/funcs/${language.toLowerCase()}`);
    if (!func) {
      return res.status(404).json({ message: "Function not found" });
    }

    await cache.set(key, JSON.stringify({ function: func }), "EX", 600);
    res.status(200).json({ function: func });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getUploadUrl = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  const language = sanitize(req.body.language, "string");

  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }
  if (!language) {
    return res.status(400).json({ message: "Missing query language" });
  }

  const problem = await Problem.findById(id);
  if (!problem) {
    return res.status(404).json({ message: "Problem not found" });
  }

  const normalizedLanguage = String(language).toLowerCase();

  const [url, _] = await Promise.all([
    s3.getSignedUploadURL(`${id}/templates/${normalizedLanguage}`),
    Problem.findByIdAndUpdate(id, { $addToSet: { supports: normalizedLanguage } }, { new: false })
  ]);
  return res.status(200).json({ url });
};

const upload = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  const language = sanitize(req.body.language, "string");

  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }
  if (!language) {
    return res.status(400).json({ message: "Missing query language" });
  }
  const normalizedLanguage = String(language).toLowerCase();

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  if (!commentMarkers[normalizedLanguage]) {
    return res.status(400).json({ message: `Unsupported language: ${normalizedLanguage}` });
  }

  try {
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const content = file.buffer.toString("utf-8");
    const [func, rest] = extractCode(content, normalizedLanguage);

    await Promise.all([
      s3.uploadContent(`${id}/templates/${normalizedLanguage}`, rest),
      s3.uploadContent(`${id}/funcs/${normalizedLanguage}`, func),
      Problem.findByIdAndUpdate(id, { $addToSet: { supports: normalizedLanguage } }, { new: false })
    ]);

    res.status(200).json({ message: "File uploaded successfully" });
  } catch (err) {
    if (err.message.includes("Unsupported language")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Markers not found") {
      return res.status(400).json({ message: "Invalid file format" });
    }
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const { title, description, difficulty, tags } = req.body;

  const request = {
    ...(title && { title }),
    ...(description && { description }),
    ...(difficulty && { difficulty: difficulty.toUpperCase() }),
    ...(Array.isArray(tags) && tags.length > 0 && { tags }),
  };

  if (Object.keys(request).length === 0) {
    return res.status(400).json({ message: "No valid fields provided for update" });
  }

  if (title) {
    const existingProblem = await Problem.findOne({ title: { $eq: title } });
    if (existingProblem && existingProblem._id.toString() !== id) {
      return res.status(409).json({ message: "Problem with this title already exists" });
    }
  }

  try {
    const updatedProblem = await Problem.findByIdAndUpdate(id, request, { new: true });
    if (!updatedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    return res.status(200).json(updatedProblem);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const problem = await Problem.findByIdAndDelete(id);

  if (!problem) {
    return res.status(404).json({ message: "Problem not found" });
  }

  await cache.del(`problem:${id}`);
  return res.status(204).send();
};

const search = async (req, res) => {
  const term = sanitize(req.query.term, "string");
  if (!term) {
    return res.status(400).send({ message: "Invalid search term" });
  }

  const key = `problems_search:${term}`;

  if (req.headers["cache-control"] !== "no-cache") {
    const cached = await cache.get(key);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
  }

  const problems = await Problem.aggregate([
    {
      "$search": {
        "index": "problemsIdx",
        "text": {
          "query": term,
          "path": "title",
          "fuzzy": {}
        }
      }
    },
    {
      "$project": {
        "description": 0,
      }
    }
  ]);

  if (!problems) {
    return res.status(404).send({ message: "No problems found" });
  }

  await cache.set(key, JSON.stringify(problems), "EX", 600);
  return res.status(200).send(problems);
};

const getLeaderboard = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  const language = sanitize(req.query.language, "string");
  const limit = sanitize(req.query.limit, "number") || 10;
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const query = {
    status: "ACCEPTED",
    problem: id,
    ...(language && { language: language.toLowerCase() }),
  };

  try {
    const submissions = await Submission.find(query).sort({ runtime: 1 }).limit(limit).select("language user runtime").populate("user");
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDailies = async (req, res) => {
  const month = sanitize(req.query.month, "number") || new Date().getMonth();
  const year = sanitize(req.query.year, "number") || new Date().getFullYear();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  try {
    const problems = await DailyProblem.find({ date: { $gte: start, $lte: end } }).populate("problem", "-description");
    res.status(200).json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProblemSolutions = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  const language = sanitize(req.query.language, "string");
  const page = sanitize(req.query.page, "number") || 1;
  const limit = sanitize(req.query.limit, "number") || 10;

  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const problem = await Problem.findById(id);
  if (!problem) {
    return res.status(404).json({ message: "Problem not found" });
  }

  const query = {
    "solution.problem": id,
    ...(language && { "solution.language": language.toLowerCase() }),
  };

  try {
    const [count, solutions] = await Promise.all([
      Discussion.countDocuments(query),
      Discussion.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).populate("author")
    ]);
    if (!solutions) {
      return res.status(404).json({ message: "Solutions not found" });
    }

    res.status(200).json({
      maxPage: Math.ceil(count / limit),
      data: solutions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const extractCode = (content, language) => {
  if (!commentMarkers[language]) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const startMarker = commentMarkers[language].start;
  const endMarker = commentMarkers[language].end;

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    throw new Error("Markers not found");
  }

  const func = content.slice(startIndex + startMarker.length, endIndex).trim();

  const beforeFunc = content.slice(0, startIndex + startMarker.length);
  const afterFunc = content.slice(endIndex);

  const rest = beforeFunc + afterFunc;

  return [func, rest];
};

const problemController = {
  getAll,
  getById,
  create,
  getUploadUrl,
  upload,
  update,
  remove,
  search,
  getLeaderboard,
  getDailies,
  getFunctionDeclaration,
  getProblemSolutions,
};

export default problemController;
