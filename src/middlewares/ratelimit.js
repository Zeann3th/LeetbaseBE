import rateLimit from "express-rate-limit";

const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20000000,
  legacyHeaders: false,
  keyGenerator: function(req) {
    return req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "";
  }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  message: "Too many requests to this email, please try again after 1 hour",
  keyGenerator: function(req) {
    return req.body.email;
  }
});

export { ipLimiter, emailLimiter };
