import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      default: null,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    Services: {
      type: String,
    },
    Name: {
      type: String,
    },
    Type: {
      type: String,
    },
    CompAddress: {
      type: String,
    },
    Website: {
      type: String,
    },
    Mobile: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    address: {
      type: String,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    updated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Video", videoSchema);
