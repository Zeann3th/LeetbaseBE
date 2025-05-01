import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  }
});

const Todo = mongoose.model("Todo", todoSchema);

export default Todo;
