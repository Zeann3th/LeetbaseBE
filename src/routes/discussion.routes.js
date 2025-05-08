import { Router } from "express";
import discussionController from "../controllers/discussion.controller.js";
import { createAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/", discussionController.getAll);

router.get("/search", discussionController.search);

router.get("/:id", discussionController.getById);

router.post("/:id/vote", createAuthMiddleware(), discussionController.vote);

router.post("/", createAuthMiddleware(), discussionController.create);

router.patch("/:id", createAuthMiddleware(), discussionController.update);

router.delete("/:id", createAuthMiddleware(), discussionController.remove);

export { router as discussionRouter };
