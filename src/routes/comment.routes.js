import { Router } from "express";
import commentController from "../controllers/comment.controller.js";
import { createAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/:id", commentController.getById);

router.post("/:id/vote", createAuthMiddleware(), commentController.vote);

router.post("/", createAuthMiddleware(), commentController.create);

router.patch("/:id", createAuthMiddleware(), commentController.update);

router.delete("/:id", createAuthMiddleware(), commentController.remove);

export { router as commentRouter };
