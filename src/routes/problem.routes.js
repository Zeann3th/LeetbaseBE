import { Router } from "express";
import { verifyAdmin, verifyUser } from "../middlewares/auth.js";
import problemController from "../controllers/problem.controller.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

router.get("/", problemController.getAll);

router.get("/search", problemController.search);

router.get("/dailies", problemController.getDailies);

router.get("/:id", problemController.getById);

router.get("/:id/functions", verifyUser, problemController.getFunctionDeclaration);

router.get("/:id/leaderboards", verifyUser, problemController.getLeaderboard);

router.post("/", verifyUser, verifyAdmin, problemController.create);

router.post("/:id/upload", verifyUser, verifyAdmin, upload.single("file"), problemController.upload);

router.patch("/:id", verifyUser, verifyAdmin, problemController.update);

router.delete("/:id", verifyUser, verifyAdmin, problemController.remove);

export { router as problemRouter };
