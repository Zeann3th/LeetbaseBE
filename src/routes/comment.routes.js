import { Router } from "express";
import commentController from "../controllers/comment.controller.js";

const router = Router();

router.get("/:id", commentController.getById);

router.post("/:id/vote", commentController.vote);

router.post("/", commentController.create);

router.patch("/:id", commentController.update);

router.delete("/:id", commentController.remove);

export { router as commentRouter };
