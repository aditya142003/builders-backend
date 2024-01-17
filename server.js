import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import videoRoutes from "./routes/video.js";
import multer from "multer";
dotenv.config({ path: "./.env" });

// express app
const app = express();
const port = process.env.PORT || 5000;

//Middlewares
app.use(
  cors({
    origin: [`${process.env.CLIENT_URL}`, "http://localhost:3000"],
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);
app.use(cors());
app.use(express.json());

app.use(errorHandler);

//Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadStorage = multer({ storage: storage });

//Routes
app.use("/api/videos", uploadStorage.single("file"), videoRoutes);

//Listen to the requests
app.listen(port, () => {
  //connect to the DB
  connectDB();
  console.log("Server Started listening on port", port);
});
