import 'dotenv/config';
import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ipLimiter } from './middlewares/ratelimit.js';
import router from './routes/index.js';
import mongoose from 'mongoose';

const app = express();
const port = process.env.PORT || 8000;

// Security
app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  credentials: true,
}));
app.use(helmet());

// Content-Type
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Logger
app.use(morgan(":method :url :status - :response-time ms"))

// Endpoints
app.get("/healthz", (req, res) => {
  res.status(200).json({ message: "Server is Healthy" });
});

app.use("/v1", ipLimiter, router);

mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME
}).then(() => {
  app.listen(port, () => {
    console.log(`
    \x1b[35m\n 🚀 LeetBase 1.0.0\n\x1b[0m
    - Local:\thttp://localhost:${port}/
    
    Note that the development build is not optimized.
    To create a production build, use \x1b[32mnpm run start\x1b[0m.\n
  `);
  })
}).catch((error) => {
  console.log('Error: ', error);
});

