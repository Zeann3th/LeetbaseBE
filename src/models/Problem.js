import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    text: {
      type: String,
      required: true,
    },
    examples: [
      {
        input: {
          type: String,
          required: true,
        },
        output: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          required: false,
        },
      }
    ],
    constraints: [
      {
        type: String,
        required: true,
      }
    ],
    extra: {
      type: String,
      required: false,
    },
  },
  difficulty: {
    type: String,
    enum: ["EASY", "MEDIUM", "HARD"],
    required: true,
  },
  tags: {
    type: [String],
    required: false,
  },
  supports: [
    {
      type: String,
      required: false,
    }
  ]
});

const Problem = mongoose.model("Problem", problemSchema);

export default Problem;
