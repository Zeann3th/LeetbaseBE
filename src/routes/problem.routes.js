import { Router } from "express";
import { createAuthMiddleware } from "../middlewares/auth.js";
import problemController from "../controllers/problem.controller.js";
import { upload } from "../middlewares/multer.js";

const router = Router();

router.get("/", problemController.getAll);

router.get("/search", problemController.search);

router.get("/dailies", problemController.getDailies);

router.get("/:id/solutions", problemController.getProblemSolutions);

router.get("/:id", problemController.getById);

router.get("/:id/functions", problemController.getFunctionDeclaration);

router.get("/:id/leaderboards", createAuthMiddleware(), problemController.getLeaderboard);

router.post("/", createAuthMiddleware({ roles: ["ADMIN"] }), problemController.create);

router.post("/:id/upload", createAuthMiddleware({ roles: ["ADMIN"] }), upload.single("file"), problemController.upload);

router.patch("/:id", createAuthMiddleware({ roles: ["ADMIN"] }), problemController.update);

router.delete("/:id", createAuthMiddleware({ roles: ["ADMIN"] }), problemController.remove);

export { router as problemRouter };
