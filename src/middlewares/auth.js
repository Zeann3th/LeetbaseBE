import jwt from "jsonwebtoken";
import Auth from "../models/Auth.js";

export const verifyToken = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).send({ message: "Access token is required for authentication" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.TOKEN_SECRET);

    const user = await Auth.findById(decoded.sub);
    if (!user.isAuthenticated) {
      return res.status(401).send({ message: "User is not authenticated" });
    }
    if (!user.isEmailVerified) {
      return res.status(403).send({ message: "Email is not verified" });
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
    ;
  }
  return next();
};

export const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).send({ message: "Unauthorized" });
  }
  return next();
}

export const verifyCsrf = (req, res, next) => {
  if (req.method === "GET") {
    return next();
  }
  if (req.headers["x-csrf-token"] !== req.cookies["_csrf"]) {
    return res.status(403).send({ message: "CSRF token mismatch" });
  }
  return next();
}

export const verifyUser = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).send({ message: "Access token is required for authentication" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.TOKEN_SECRET);

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
