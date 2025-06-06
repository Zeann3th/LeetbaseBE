import { Router } from "express";
import { createAuthMiddleware } from "../middlewares/auth.js";
import { authRouter } from "./auth.routes.js";
import { userRouter } from "./user.routes.js";
import { problemRouter } from "./problem.routes.js";
import { submissionRouter } from "./submission.routes.js";
import { discussionRouter } from "./discussion.routes.js";
import { commentRouter } from "./comment.routes.js";
import problemController from "../controllers/problem.controller.js";

const v1Router = Router();

v1Router.use("/auth", authRouter);

v1Router.use("/users", userRouter);

v1Router.use("/problems", problemRouter);

v1Router.use("/submissions", createAuthMiddleware(), submissionRouter);

v1Router.use("/discussions", discussionRouter);

v1Router.use("/comments", commentRouter);

const v2Router = Router();

v2Router.post("/problems/:id/upload", createAuthMiddleware({ roles: ["ADMIN"] }), problemController.getUploadUrl);

export { v1Router, v2Router };
