import { Router } from "express";
import userController from "../controllers/user.controller.js";
import { createAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/", createAuthMiddleware({ roles: ["ADMIN"] }), userController.getAll);

router.get("/profile", createAuthMiddleware({ requireEmailVerified: false }), userController.getProfile);

router.get("/submissions", createAuthMiddleware(), userController.getSubmissionHistory);

router.get("/todos", createAuthMiddleware({ allowService: true }), userController.getTodoList);

router.post("/todos", createAuthMiddleware({ allowService: true }), userController.addProblemsToTodo);

router.delete("/todos/:problem", createAuthMiddleware({ allowService: true }), userController.removeProblemFromTodo);

router.get("/:id", createAuthMiddleware({ requireEmailVerified: false }), userController.getById);

router.patch("/:id", createAuthMiddleware({ requireEmailVerified: false }), userController.update);

export { router as userRouter };
