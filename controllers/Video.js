import Video from "../models/Video.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import fs2 from "fs/promises";
import axios from "axios";
import exifr from "exifr";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI("AIzaSyBSddIGO1UIl-QxLWDWmNrXXaYAbVaRHyE");

// Converts file information to a GoogleGenerativeAI.Part object.
const fileToGenerativePart = async (pathOrUrl, mimeType) => {
  if (pathOrUrl.startsWith("http")) {
    // Remote image
    const response = await axios.get(pathOrUrl, {
      responseType: "arraybuffer",
    });
    const data = Buffer.from(response.data, "binary").toString("base64");
    return {
      inlineData: {
        data,
        mimeType,
      },
    };
  } else {
    // Local image
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(pathOrUrl)).toString("base64"),
        mimeType,
      },
    };
  }
};

async function convertDMSToDD(degrees, minutes, seconds, direction) {
  let dd = degrees + minutes / 60 + seconds / 3600;
  return direction === "S" || direction === "W" ? -dd : dd;
}

async function getImageLocation(imagePath) {
  try {
    const fileData = await fs2.readFile(imagePath);
    const exifData = await exifr.parse(fileData);
    const location = {
      latitude: 0,
      longitude: 0,
      detail: "No details",
    };

    if (exifData && exifData.latitude && exifData.longitude) {
      const latitudeDecimal = await convertDMSToDD(
        exifData.latitude,
        0,
        0,
        exifData.latitudeRef
      );
      const longitudeDecimal = await convertDMSToDD(
        exifData.longitude,
        0,
        0,
        exifData.longitudeRef
      );

      location.latitude = latitudeDecimal.toFixed(6);
      location.longitude = longitudeDecimal.toFixed(6);

      const apiKey = "9f718b3bd71341beadabc3cda202e1f9";
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?key=${apiKey}&q=${latitudeDecimal},${longitudeDecimal}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        location.detail = data.results[0];
      }
    }
    return location;
  } catch (error) {
    console.error("Error reading image metadata:", error);
  }
}

async function getImageLocationFromLatLong(lat, long) {
  const location = {
    latitude: lat,
    longitude: long,
    detail: "No details",
  };
  if (lat && long) {
    const latitudeDecimal = await convertDMSToDD(lat, 0, 0, undefined);
    const longitudeDecimal = await convertDMSToDD(long, 0, 0, undefined);

    location.latitude = latitudeDecimal.toFixed(6);
    location.longitude = longitudeDecimal.toFixed(6);

    const apiKey = "9f718b3bd71341beadabc3cda202e1f9";
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?key=${apiKey}&q=${latitudeDecimal},${longitudeDecimal}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      location.detail = data.results[0];
    }
  }

  return location;
}

async function extractScreenshot(sourcePath) {
  return new Promise((resolve, reject) => {
    ffmpeg({ source: sourcePath })
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        console.error(err);
        reject(err);
      })
      .takeScreenshots(
        {
          filename: "test.jpg",
          timemarks: [1],
        },
        "uploads"
      );
  });
}

export const createVideo = async (req, res, next) => {
  let { imageUrl, type, lat, long } = req.body;
  imageUrl = JSON.parse(imageUrl);
  type = JSON.parse(type);
  let location;
  if (lat && long) {
    lat = JSON.parse(lat);
    long = JSON.parse(long);
    location = await getImageLocationFromLatLong(lat, long);
  }
  if (type == "image") {
    location = await getImageLocation(req.file.path);
    fs.unlinkSync(req.file.path);

    if (!imageUrl) {
      res.status(400);
      return next(new Error("imgUrl required"));
    }
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

      const prompt =
        "Answer the following questions only 2 - 3 word answers for each question and if some detail is not provided than send null and apply break line after every answer: 1) What are the services provided by the company?, 2) What is the company name? 3) What is the phone number? 4)What is the address of the company mentioned? 5)What is the website of the company as mentioned in text, website ends with .com? 6) Is the majority of the text displayed on a card or vehicle or poster or construction site?";

      const imagePart = await fileToGenerativePart(imageUrl, "image/jpeg"); // Use the imageUrl from the request

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      console.log(text);
      // Split the text into three statements
      const statements = text.split("\n").map((statement) => statement.trim());

      // Remove statement numbers and format the output
      const [Services, Name, Mobile, CompAddress, Website, Type] =
        statements.map(
          (statement) =>
            statement
              .replace(/^\d+\)\s/, "") // Remove statement number and trailing space
              .replace(/\.$/, "") // Remove trailing period
              .trim() // Trim any extra spaces
        );
      // console.log(Type);

      // Your existing Video creation logic here
      const video = await Video.create({
        imageUrl,
        Type,
        Services,
        Name,
        Mobile,
        CompAddress,
        Website,
        longitude: location.longitude,
        latitude: location.latitude,
        address: location.detail.formatted,
      });
      // console.log(imageUrl);
      // console.log(videoUrl);
      res.status(201).json({
        message: "success",
      });
    } catch (error) {
      console.log(error);
      res.status(500);
      next(error);
    }
  } else {
    await extractScreenshot(req.file.path);
    fs.unlinkSync(req.file.path);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

      const prompt =
        "Answer the following questions only 2 - 3 word answers for each question and if some detail is not provided than send null and apply break line after every answer: 1) What are the services provided by the company?, 2) What is the company name? 3) What is the phone number? 4)What is the address of the company mentioned? 5)What is the website of the company as mentioned in text, website ends with .com? 6) Is the majority of the text displayed on a card or vehicle or poster or construction site?";

      const imagePart = await fileToGenerativePart(
        "./uploads/test.jpg",
        "image/jpeg"
      ); // Use the imageUrl from the request

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      console.log(text);
      fs.unlinkSync("./uploads/test.jpg");

      // Split the text into three statements
      const statements = text.split("\n").map((statement) => statement.trim());

      // Remove statement numbers and format the output
      const [Services, Name, Mobile, CompAddress, Website, Type] =
        statements.map(
          (statement) =>
            statement
              .replace(/^\d+\)\s/, "") // Remove statement number and trailing space
              .replace(/\.$/, "") // Remove trailing period
              .trim() // Trim any extra spaces
        );
      // console.log(Type);

      // Your existing Video creation logic here
      const video = await Video.create({
        videoUrl: imageUrl,
        Type,
        Services,
        Name,
        Mobile,
        CompAddress,
        Website,
        longitude: long ? long : 0,
        latitude: lat ? lat : 0,
        address: location?.detail?.formatted ? location.detail.formatted : null,
      });

      res.status(201).json({
        message: "success",
      });
    } catch (error) {
      console.log(error);
      res.status(500);
      next(error);
    }
  }
};

export const getData = async (req, res) => {
  try {
    const getAllData = await Video.find();
    res.json(getAllData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAData = async (req, res) => {
  const { id } = req.params;
  try {
    const getSingleData = await Video.findById(id);

    if (!getSingleData) {
      res.status(404).json({ msg: "Document not found" });
      return;
    }

    res.json(getSingleData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const deleteData = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedData = await Video.findByIdAndDelete(id);

    if (!deletedData) {
      // If no document was found and deleted
      res.status(404).json({ msg: "Document not found" });
      return;
    }

    res.status(200).json({ msg: "Successfully deleted", deletedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const updateData = async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const updateData = await Video.findByIdAndUpdate(
      id,
      {
        imageUrl: req?.body?.imageUrl,
        Services: req?.body?.Services,
        Type: req?.body?.Type,
        Email: req?.body?.Email,
        Name: req?.body?.Name,
        Mobile: req?.body?.Mobile,
        CompAddress: req?.body?.CompAddress,
        reviewed: req?.body?.Reviewed,
        updated: req?.body?.updated,
      },
      {
        new: true,
      }
    );

    if (!updateData) {
      // If no document was found and deleted
      res.status(404).json({ msg: "Document not found" });
      return;
    }

    res.status(200).json({ msg: "Successfully deleted", updateData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
