const { imageUrl,videoUrl } = require('./video');

// Use the imported variables
console.log(imageUrl + ' ' + videoUrl);






const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const axios = require("axios");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI("AIzaSyBSddIGO1UIl-QxLWDWmNrXXaYAbVaRHyE");

// Converts file information to a GoogleGenerativeAI.Part object.
async function fileToGenerativePart(pathOrUrl, mimeType) {
  if (pathOrUrl.startsWith("http")) {
    // Remote image
    const response = await axios.get(pathOrUrl, { responseType: "arraybuffer" });
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
}

async function run() {
  // For text-and-image input (multimodal), use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt =
    "Answer the following questions: 1) What are the services provided by the company?, 2) What is the text displayed? 3) Is the majority of the text displayed on a card or vehicle or poster or construction site?";

  const imageParts = [
    //await fileToGenerativePart("./IMG_9891.jpeg", "image/jpeg"), // Local image
    await fileToGenerativePart(imageUrl, "image/jpeg"), // Remote image
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();
  console.log(text);
}

run();