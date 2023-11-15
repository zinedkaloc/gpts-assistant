/* require("dotenv").config();
const openaiAssistant = require("./openaiAssistant");
const startWebSocketServer = require("./websocketServer");

async function setupAndStartServer(PORT) {
  try {
    const fileId = await openaiAssistant.uploadFile("uploads/file.pdf");
    const id = await openaiAssistant.createAssistant(fileId);
    startWebSocketServer(PORT, id);
  } catch (error) {
    console.error("An error occurred during setup:", error);
  }
}

// Call the setup function with the desired port
const PORT = 3000;
setupAndStartServer(PORT);
 */
require("dotenv").config();
const openaiAssistant = require("./openaiAssistant");
const {
  startWebSocketServer,
  updateAssistantId,
} = require("./websocketServer");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const PORT = 3000;
const WS_PORT = 3001; // Separate port for WebSocket server
const app = express();
app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// File upload endpoint
app.post("/uploadFile", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("No file uploaded.");
    }

    const filePath = req.file.path;
    const fileId = await openaiAssistant.uploadFileByUser(filePath);
    // Update the assistant based on uploaded file
    const assistantId = await openaiAssistant.createAssistantByUser(
      req.body.name,
      req.body.instructions,
      fileId
    );
    // Consider how to handle the updated assistantId here
    updateAssistantId(assistantId); // Update the WebSocket server with the new assistant ID

    res.json({ fileId, assistantId });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// Start WebSocket server
startWebSocketServer(WS_PORT, null); // Initially start with a null assistantId
