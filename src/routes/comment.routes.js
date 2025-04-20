import { Router } from "express";
import commentController from "../controllers/comment.controller.js";
import { verifyUser } from "../middlewares/auth.js";

const router = Router();

router.get("/:id", commentController.getById);

router.post("/:id/vote", verifyUser, commentController.vote);

router.post("/", verifyUser, commentController.create);

router.patch("/:id", verifyUser, commentController.update);

router.delete("/:id", verifyUser, commentController.remove);

export { router as commentRouter };
