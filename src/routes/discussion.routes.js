import { Router } from "express";
import discussionController from "../controllers/discussion.controller.js";
import { verifyUser } from "../middlewares/auth.js";

const router = Router();

router.get("/", discussionController.getAll);

router.get("/search", discussionController.search);

router.get("/:id", discussionController.getById);

router.post("/:id/vote", verifyUser, discussionController.vote);

router.post("/", verifyUser, discussionController.create);

router.patch("/:id", verifyUser, discussionController.update);

router.delete("/:id", verifyUser, discussionController.remove);

export { router as discussionRouter };
