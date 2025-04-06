import { Router } from "express";
import { verifyAdmin } from "../middlewares/auth.js";
import problemController from "../controllers/problem.controller.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

router.get("/", problemController.getAll);

router.get("/search", problemController.search);

router.get("/dailies", problemController.getDailies);

router.get("/:id", problemController.getById);

router.get("/:id/leaderboards", problemController.getLeaderboard);

router.post("/", verifyAdmin, problemController.create);

router.post("/:id/upload", upload.single("file"), verifyAdmin, problemController.upload);

router.patch("/:id", verifyAdmin, problemController.update);

router.delete("/:id", verifyAdmin, problemController.remove);

export { router as problemRouter };
