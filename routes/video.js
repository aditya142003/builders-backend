import express from "express";
import {
  createVideo,
  deleteData,
  getAData,
  getData,
  updateData,
} from "../controllers/Video.js";

const router = express.Router();

//http://localhost:5000/api/videos/
router
  .post("/", createVideo)
  .get("/", getData)
  .get("/:id", getAData)
  .delete("/:id", deleteData)
  .put("/:id", updateData);

export default router;
