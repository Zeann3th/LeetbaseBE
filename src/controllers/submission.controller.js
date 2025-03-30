import axios from "axios";
import { sanitize } from "../utils.js";
import Problem from "../models/Problem.js";
import s3 from "../services/storage.js";
import Submission from "../models/Submission.js";

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
}

const create = async (req, res) => {
  const problemId = sanitize(req.body.problemId, "mongo");
  const language = sanitize(req.body.language, "string");
  const code = req.body.code;

  if (!problemId || !language || !code) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    const [problem, template, languageVersion] = await Promise.all([
      Problem.findById(problemId),
      s3.getDownloadUrl(`${problemId}/${language.toLowerCase()}`),
      getLanguageVersion(language),
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

    const submit = template.replace(/\/\/--code--/g, code);

    const options = {
      method: 'POST',
      url: 'https://emkc.org/api/v2/piston/execute',
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        language: language,
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
      status: compile?.stderr
        ? "COMPILE_ERROR"
        : run?.stderr
          ? "WRONG_ANSWER"
          : "ACCEPTED",
      code,
      error: compile?.stderr || run?.stderr || null,
      runtime: end - start,
    });
    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

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
  getById,
  create,
};

export default submissionController;
