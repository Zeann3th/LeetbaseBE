import { Router } from "express";
import { verifyUser } from "../middlewares/auth.js";
import { authRouter } from "./auth.routes.js";
import { userRouter } from "./user.routes.js";
import { problemRouter } from "./problem.routes.js";

const router = Router();

router.use("/auth", authRouter);

router.use("/users", verifyUser, userRouter);

router.use("/problems", verifyUser, problemRouter);

export default router;
