import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "WRONG_ANSWER", "COMPILE_ERROR"],
    default: "PENDING",
  },
  code: {
    type: String,
    required: true,
  },
  error: {
    type: String,
  },
  runtime: {
    type: Number,
  },
}, { timestamps: true });

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;
