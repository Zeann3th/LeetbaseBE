import mongoose from "mongoose";

const dailyProblemSchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  date: {
    type: Date,
    required: true,
    unique: true,
  }
});

const DailyProblem = mongoose.model("DailyProblem", dailyProblemSchema);

export default DailyProblem;
