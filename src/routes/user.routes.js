import { Router } from "express";
import userController from "../controllers/user.controller.js";

const router = Router();

router.get("/", userController.getAll);

router.get("/profile", userController.getProfile);

router.get("/submissions", userController.getSubmissionHistory);

router.get("/:id", userController.getById);

router.patch("/:id", userController.update);

export { router as userRouter };
