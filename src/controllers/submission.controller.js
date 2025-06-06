import axios from "axios";
import { sanitize } from "../utils.js";
import Problem from "../models/Problem.js";
import s3 from "../services/storage.js";
import Submission from "../models/Submission.js";
import { commentMarkers } from "../config/markers.js";

const getAll = async (req, res) => {
  const problemId = sanitize(req.query.problemId, "mongo");
  const language = sanitize(req.query.language, "string");
  const page = sanitize(req.query.page, "number") || 1;
  const limit = sanitize(req.query.limit, "number") || 10;

  try {
    const query = {
      user: req.user.sub,
      ...(problemId && { problem: problemId }),
      ...(language && { language }),
    }
    const [count, submissions] = await Promise.all([
      Submission.countDocuments(query),
      Submission.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit)
    ]);

    res.status(200).json({
      maxPage: Math.ceil(count / limit),
      data: submissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getById = async (req, res) => {
  const id = sanitize(req.params.id, "mongo");
  if (!id) {
    return res.status(400).json({ message: "Invalid Submission Id" });
  }
  try {
    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }
    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const create = async (req, res) => {
  const problemId = sanitize(req.body.problemId, "mongo");
  const language = sanitize(req.body.language, "string");
  let pistonLang = language;
  const code = req.body.code;

  if (!problemId || !language || !code) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  // Exclusion list
  if (language === "cpp") {
    pistonLang = "c++";
  }

  try {
    const [problem, template, languageVersion] = await Promise.all([
      Problem.findById(problemId),
      s3.getContent(`${problemId}/templates/${language.toLowerCase()}`),
      getLanguageVersion(pistonLang),
    ]);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    if (!languageVersion) {
      return res.status(404).json({ message: "Language version not found" });
    }

    const startMarker = commentMarkers[language].start;
    const endMarker = commentMarkers[language].end;
    const startIndex = template.indexOf(startMarker);
    const endIndex = template.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      return res.status(400).json({ message: "Template markers not found" });
    }

    const submit = template.slice(0, startIndex + startMarker.length) +
      "\n" + code + "\n" +
      template.slice(endIndex);

    const options = {
      method: 'POST',
      url: 'https://emkc.org/api/v2/piston/execute',
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        language: pistonLang,
        version: languageVersion,
        files: [
          { content: submit }
        ]
      }
    };

    const start = performance.now();
    const { data: { run, compile } } = await axios.request(options);
    const end = performance.now();

    const submission = await Submission.create({
      user: req.user.sub,
      problem: problemId,
      language,
      status: compile?.stderr ? "COMPILE_ERROR" : run?.stderr ? "WRONG_ANSWER" : "ACCEPTED",
      code,
      error: compile?.stderr || run?.stderr || null,
      runtime: end - start,
    });
    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLanguageVersion = async (language) => {
  try {
    const options = {
      method: 'GET',
      url: 'https://emkc.org/api/v2/piston/runtimes',
    };
    const { data } = await axios.request(options);

    const runtime = data.find((runtime) => runtime.language === language);
    if (!runtime) {
      throw new Error(`Language ${language} not found`);
    }

    return runtime.version;
  } catch (error) {
    throw new Error(`Error getting language version: ${error.message}`);
  }
};

const submissionController = {
  getAll,
  getById,
  create,
};

export default submissionController;
