import jwt from "jsonwebtoken";
import Auth from "../models/Auth.js";
import bcrypt from "bcrypt";
import { isProduction, sanitize } from "../utils.js";
import cache from "../services/cache.js";
import mail from "../services/mail.js";
import User from "../models/User.js";
import crypto from "crypto";
import axios from "axios";

const saltRounds = 10;

const register = async (req, res) => {
  const { username, password, email, name, avatar } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  const user = await Auth.findOne({
    $or: [
      { username: { $eq: username } },
      { email: { $eq: email } }
    ]
  });

  if (user) {
    if (user.username === username) {
      return res.status(409).json({ message: `User with username ${username} already exists` });
    }

    if (user.email === email) {
      return res.status(418).json({ message: `User with email ${email} already exists` });
    }
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  try {
    const auth = await Auth.create({
      username,
      password: hashedPassword,
      email
    });

    try {
      await User.create({
        _id: auth._id,
        name: sanitize(name, "string") || "User" + crypto.randomUUID().slice(0, 5),
        avatar: sanitize(avatar, "url") || null
      });

      const payload = { sub: auth._id, username: auth.username, role: auth.role, email: auth.email, isVerified: auth.isEmailVerified };

      const accessToken = jwt.sign(
        payload,
        process.env.TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      const csrfToken = crypto.randomUUID();

      await auth.updateOne({ refreshToken, isAuthenticated: true });

      res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: isProduction, path: "/", maxAge: 24 * 60 * 60 * 1000, sameSite: isProduction ? "none" : "lax", partitioned: isProduction });
      res.cookie("_csrf", csrfToken, { httpOnly: true, secure: isProduction, path: "/", sameSite: isProduction ? "none" : "lax", partitioned: isProduction });

      mail.sendVerifyEmail(email);
      return res.status(201).json({ accessToken, csrfToken });
    } catch (err) {
      await Auth.findByIdAndDelete(auth._id);
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const verifyEmail = async (req, res) => {
  const pin = sanitize(req.body.pin, "string");
  const email = sanitize(req.body.email, "email");

  if (!pin || !email) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    let cachedPin = await cache.get(`verify:${email}`);
    cachedPin = sanitize(cachedPin, "string");
    if (!cachedPin) {
      return res.status(400).json({ message: "Invalid or expired pin" });
    }

    if (req.body.pin !== cachedPin) {
      return res.status(400).json({ message: "Invalid or expired pin" });
    }

    const [user, _] = await Promise.all([
      Auth.findOneAndUpdate({ email: { $eq: email } }, { isEmailVerified: true }),
      cache.del(`verify:${email}`)
    ]);

    const payload = { sub: user._id, username: user.username, role: user.role, email: user.email, isVerified: true };

    const accessToken = jwt.sign(
      payload,
      process.env.TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    await user.updateOne({ refreshToken, isAuthenticated: true });

    const csrfToken = crypto.randomUUID();

    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: isProduction, path: "/", maxAge: 24 * 60 * 60 * 1000, sameSite: isProduction ? "none" : "lax", partitioned: isProduction });
    res.cookie("_csrf", csrfToken, { httpOnly: true, secure: isProduction, path: "/", sameSite: isProduction ? "none" : "lax", partitioned: isProduction });

    return res.status(200).json({ accessToken, csrfToken });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const resendEmail = async (req, res) => {
  let action = sanitize(req.body.action, "string");
  const email = sanitize(req.body.email, "email");

  if (!email || !action) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    action = action.toLowerCase();
    if (action === "verify") {
      await mail.sendVerifyEmail(email);
    } else if (action === "reset") {
      await mail.sendResetPasswordEmail(email);
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  const { username, email, password } = req.body;
  const identifier = username || email;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    const auth = await Auth.findOne({
      $or: [
        { username: { $eq: identifier } },
        { email: { $eq: identifier } }
      ]
    });
    if (!auth) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, auth.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const payload = { sub: auth._id, username: auth.username, role: auth.role, email: auth.email, isVerified: auth.isEmailVerified };

    const accessToken = jwt.sign(
      payload,
      process.env.TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    const csrfToken = crypto.randomUUID();

    await auth.updateOne({ refreshToken, isAuthenticated: true });

    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: isProduction, path: "/", maxAge: 24 * 60 * 60 * 1000, sameSite: isProduction ? "none" : "lax", partitioned: isProduction });
    res.cookie("_csrf", csrfToken, { httpOnly: true, secure: isProduction, path: "/", sameSite: isProduction ? "none" : "lax", partitioned: isProduction });

    return res.status(200).json({ accessToken, csrfToken });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh Token is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await Auth.findOne({ refreshToken: { $eq: refreshToken } });
    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { sub: decoded.sub, username: decoded.username, role: decoded.role, email: decoded.email, isVerified: decoded.isVerified },
      process.env.TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(200).json({ accessToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    return res.status(500).json({ message: err.message });
  }
};

const logout = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(204).send();
  }

  const user = await Auth.findOne({ refreshToken: { $eq: refreshToken } });
  if (user) {
    await user.updateOne({ refreshToken: null, isAuthenticated: false });
  }

  res.clearCookie("refresh_token", { httpOnly: true, secure: isProduction, path: "/", partitioned: isProduction, sameSite: isProduction ? "none" : "lax" });
  res.clearCookie("_csrf", { httpOnly: true, secure: isProduction, path: "/", partitioned: isProduction, sameSite: isProduction ? "none" : "lax" });
  return res.status(204).send();
};

const forgotPassword = async (req, res) => {
  const email = sanitize(req.body.email, "email");

  if (!email) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    const user = await Auth.findOne({ email: { $eq: email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    mail.sendResetPasswordEmail(email);
    return res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  const email = sanitize(req.body.email, "email");
  const pin = sanitize(req.body.pin, "string");
  const password = sanitize(req.body.password, "string");

  if (!pin || !email || !password) {
    return res.status(400).json({ message: "Missing required fields in payload" });
  }

  try {
    let cachedPin = await cache.get(`reset:${email}`);
    cachedPin = sanitize(cachedPin, "string");
    if (!cachedPin || cachedPin !== pin) {
      return res.status(400).json({ message: "Invalid or expired pin" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await Promise.all([
      Auth.findOneAndUpdate({ email: { $eq: email } }, { password: hashedPassword }),
      cache.del(`reset:${email}`)
    ]);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const redirectOAuth = async (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GH_CLIENT_ID}&scope=read:user%20user:email`;
  return res.redirect(url);
};

const handleOAuthCallback = async (req, res) => {
  const code = sanitize(req.query.code, "string");

  if (!code) {
    return res.status(400).json({ message: "Missing code in query" });
  }

  try {
    const { data: { access_token } } = await axios.post("https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GH_CLIENT_ID,
        client_secret: process.env.GH_CLIENT_SECRET,
        code
      },
      {
        headers: { "Accept": "application/json" }
      }
    );

    const [{ data: githubUser }, { data: githubEmails }] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { "Authorization": `token ${access_token}` }
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { "Authorization": `token ${access_token}` }
      })
    ]);

    const email = githubEmails.find(email => email.primary === true && email.verified === true)?.email;
    if (!email) {
      return res.status(400).json({ message: "Primary email not found" });
    }

    let user = await Auth.findOne({ email: { $eq: email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(crypto.randomBytes(64).toString("hex"), saltRounds);
      user = await Auth.create({
        username: githubUser.login + "_" + crypto.randomUUID().slice(0, 5),
        email,
        isEmailVerified: true,
        password: hashedPassword,
        isAuthenticated: true
      });
      await User.create({
        _id: user._id,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url
      });
    }

    const payload = { sub: user._id, username: user.username, role: user.role, email: user.email, isVerified: user.isEmailVerified };
    const accessToken = jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" });
    const csrfToken = crypto.randomUUID();

    await user.updateOne({ refreshToken, isAuthenticated: true });

    res.cookie("refresh_token", refreshToken, { httpOnly: true, secure: isProduction, maxAge: 24 * 60 * 60 * 1000, path: "/", sameSite: isProduction ? "none" : "lax", partitioned: isProduction });
    res.cookie("_csrf", csrfToken, { httpOnly: true, secure: isProduction, path: "/", sameSite: isProduction ? "none" : "lax", partitioned: isProduction });

    return res.redirect(`${process.env.APP_URL}?accessToken=${accessToken}&csrfToken=${csrfToken}`);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const authController = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendEmail,
  forgotPassword,
  resetPassword,
  redirectOAuth,
  handleOAuthCallback
};

export default authController;
