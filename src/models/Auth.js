import mongoose from "mongoose";

const authSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    required: true,
    enum: ["USER", "ADMIN"],
    default: "USER",
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  refreshToken: {
    type: String,
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
},
  { timestamps: true }
);

const Auth = mongoose.model("Auth", authSchema);

export default Auth;
