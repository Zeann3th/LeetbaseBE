import { Router } from "express";
import { verifyUser } from "../middlewares/auth.js";
import { authRouter } from "./auth.routes.js";
import { userRouter } from "./user.routes.js";
import { problemRouter } from "./problem.routes.js";
import { submissionRouter } from "./submission.routes.js";
import { discussionRouter } from "./discussion.routes.js";
import { commentRouter } from "./comment.routes.js";

const router = Router();

router.use("/auth", authRouter);

router.use("/users", verifyUser, userRouter);

router.use("/problems", verifyUser, problemRouter);

router.use("/submissions", verifyUser, submissionRouter);

router.use("/discussions", verifyUser, discussionRouter);

router.use("/comments", verifyUser, commentRouter);

export default router;
