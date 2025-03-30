import { Router } from "express";
import discussionController from "../controllers/discussion.controller.js";

const router = Router();

router.get("/", discussionController.getAll)

router.get("/search", discussionController.search)

router.get("/:id", discussionController.getById)

router.post("/:id/vote", discussionController.vote)

router.post("/", discussionController.create)

router.patch("/:id", discussionController.update)

router.delete("/:id", discussionController.remove)

export { router as discussionRouter };
