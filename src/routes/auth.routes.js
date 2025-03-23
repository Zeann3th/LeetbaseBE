import { Router } from "express";
import { emailLimiter } from "../middlewares/ratelimit.js";
import authController from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", authController.register);

router.post("/verify-email", authController.verifyEmail);

router.post("/login", authController.login);

router.get("/github", authController.redirectOAuth);

router.get("/github/callback", authController.handleOAuthCallback);

router.get("/logout", authController.logout);

router.get("/refresh", authController.refresh);

router.post("/forgot-password", emailLimiter, authController.forgotPassword);

router.post("/reset-password", emailLimiter, authController.resetPassword);

router.post("/resend-email", emailLimiter, authController.resendEmail);

export { router as authRouter };
