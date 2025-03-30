import { Router } from "express";
import submissionController from "../controllers/submission.controller.js";

const router = Router();

router.get("/:id", submissionController.getById);

router.post("/", submissionController.create);

export { router as submissionRouter };
