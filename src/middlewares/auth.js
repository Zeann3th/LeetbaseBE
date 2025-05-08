import jwt from "jsonwebtoken";
import Auth from "../models/Auth.js";

export const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).send({ message: "Unauthorized" });
  }
  return next();
}

export const verifyUser = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(403).send({ message: "Access token is required for authentication" });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(400).send({ message: "Invalid authorization header format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    const user = await Auth.findById(decoded.sub);
    if (!user.isAuthenticated) {
      return res.status(401).send({ message: "User is not authenticated" });
    }
    if (!user.isEmailVerified) {
      return res.status(403).send({ message: "Email is not verified" });
    }
    if (req.method !== "GET" && req.headers["x-csrf-token"] !== req.cookies["_csrf"]) {
      return res.status(403).send({ message: "CSRF token mismatch" });
    }

    req.user = decoded;

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send({ message: "Token has expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).send({ message: "Invalid token" });
    } else if (err.name === "NotBeforeError") {
      return res.status(401).send({ message: "Token is not yet active" });
    }
    return res.status(500).send({ message: "Authentication error" });
  }
  return next();
};

/**
 * Creates a configurable authentication middleware
 * 
 * @param {Object} options - Middleware configuration options
 * @param {boolean} [options.requireEmailVerified=true] - Whether to require email verification
 * @param {boolean} [options.requireCsrf=true] - Whether to enforce CSRF protection
 * @param {string[]} [options.roles=[]] - Required roles for authorization (empty array = no role restrictions)
 * @param {boolean} [options.allowService=false] - Whether to allow service token authentication
 * @returns {Function} Express middleware function
 */
export const createAuthMiddleware = ({ requireEmailVerified = true, requireCsrf = true, roles = [], allowService = false } = {}) => {
  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(403).send({ message: "Access token is required for authentication" });
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(400).send({ message: "Invalid authorization header format" });
    }

    try {
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      const user = await Auth.findById(decoded.sub).lean();

      if (!user?.isAuthenticated) {
        return res.status(401).send({ message: "User is not authenticated" });
      }

      if (requireEmailVerified && !user?.isEmailVerified) {
        return res.status(403).send({ message: "Email is not verified" });
      }

      const bypass = allowService && req.headers["x-service-token"] === process.env.SERVICE_TOKEN;

      if (!bypass && requireCsrf && req.method !== "GET" && req.headers["x-csrf-token"] !== req.cookies["_csrf"]) {
        return res.status(403).send({ message: "CSRF token mismatch" });
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).send({ message: "Insufficient permissions" });
      }

      const { password, refreshToken, ...safeUser } = user;

      req.user = {
        ...decoded,
        ...safeUser,
      };
      return next();

    } catch (err) {
      const jwtErrors = {
        TokenExpiredError: { code: 401, msg: "Token has expired" },
        JsonWebTokenError: { code: 401, msg: "Invalid token" },
        NotBeforeError: { code: 401, msg: "Token is not yet active" },
      };

      const { code, msg } = jwtErrors[err.name] || { code: 500, msg: "Authentication error" };
      return res.status(code).send({ message: msg });
    }
  };
};

