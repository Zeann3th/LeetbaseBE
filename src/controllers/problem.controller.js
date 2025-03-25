import Problem from "../models/Problem.js";
import cache from "../services/cache.js";
import { sanitize } from "../utils.js";
import s3 from "../services/storage.js";
import Submission from "../models/Submission.js";
import DailyProblem from "../models/DailyProblem.js";

const getAll = async (req, res) => {
  const limit = sanitize(req.query.limit, "number") || 10;
  const page = sanitize(req.query.page, "number") || 1;

  const key = `problems:${limit}:${page}`;

  try {
    if (req.headers["Cache-Control"] !== "no-cache") {
      const cachedProblems = await cache.get(key);
      if (cachedProblems) {
        return res.status(200).json(JSON.parse(cachedProblems));
      }
    }

    const problems = await Problem.find().limit(limit).skip((page - 1) * limit);
    await cache.set(key, JSON.stringify(problems), "EX", 600);

    return res.status(200).json(problems);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

const getById = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Missing path id" });
  }

  const key = `problem:${id}`;

  try {
    if (req.headers["Cache-Control"] !== "no-cache") {
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
}

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
    })
    return res.status(201).json(problem);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

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

  const url = await s3.getSignedUploadURL(`${id}/${language.toLowerCase()}`);
  return res.status(200).json({ url });
}

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
}

const search = async (req, res) => {
  const term = sanitize(req.query.term, "string");
  if (!term) {
    return res.status(400).send({ message: "Invalid search term" });
  }

  const key = `problems_search:${term}`;

  if (req.headers["Cache-Control"] !== "no-cache") {
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
    }
  ])

  if (!problems) {
    return res.status(404).send({ message: "No problems found" });
  }

  await cache.set(key, JSON.stringify(problems), "EX", 600);
  return res.status(200).send(problems);
}

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
  }

  try {
    const submissions = await Submission.find(query).sort({ runtime: 1 }).limit(limit).select("language user runtime").populate("user");
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getDailies = async (req, res) => {
  const month = sanitize(req.query.month, "number") || new Date().getMonth();
  const year = sanitize(req.query.year, "number") || new Date().getFullYear();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  try {
    const problems = await DailyProblem.find({ date: { $gte: start, $lte: end } }).populate("problem");
    res.status(200).json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const problemController = {
  getAll,
  getById,
  create,
  getUploadUrl,
  update,
  remove,
  search,
  getLeaderboard,
  getDailies,
}

export default problemController;
