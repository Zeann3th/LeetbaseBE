import { Router } from "express";
import { verifyAdmin } from "../middlewares/auth.js";
import problemController from "../controllers/problem.controller.js";

const router = Router();

router.get("/", problemController.getAll)

router.get("/search", problemController.search)

router.get("/:id", problemController.getById)

router.get("/:id/dailies", problemController.getDailies)

router.get("/:id/leaderboards", problemController.getLeaderboard)

router.post("/", verifyAdmin, problemController.create)

router.post("/:id/upload", verifyAdmin, problemController.getUploadUrl)

router.patch("/:id", verifyAdmin, problemController.update)

router.delete("/:id", verifyAdmin, problemController.remove)

export { router as problemRouter };
