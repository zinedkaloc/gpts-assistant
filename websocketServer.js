const WebSocket = require("ws");
const openaiAssistant = require("./openaiAssistant");

let currentAssistantId; // Global variable to store the current assistant ID

function startWebSocketServer(port) {
  const wss = new WebSocket.Server({ port });
  const sessionThreads = new Map(); // Store session thread IDs

  wss.on("connection", function connection(ws) {
    let threadId;

    ws.on("message", async function incoming(message) {
      console.log("received: %s", message);

      try {
        if (!sessionThreads.has(ws)) {
          threadId = await openaiAssistant.createThread();
          sessionThreads.set(ws, threadId);
        } else {
          threadId = sessionThreads.get(ws);
        }

        await openaiAssistant.addMessageToThread(threadId, message);
        // Use currentAssistantId here
        const response = await openaiAssistant.runAssistantAndGetResponse(
          threadId,
          currentAssistantId
        );
        const speechBuffer = await openaiAssistant.generateSpeech(response);

        ws.send(JSON.stringify({ type: "text", data: response }));
        setTimeout(() => {
          ws.send(speechBuffer, { binary: true });
        }, 500);
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: "Sorry, an error occurred while processing your message.",
          })
        );
      }
    });

    ws.on("close", function close() {
      sessionThreads.delete(ws);
    });
  });

  console.log(`WebSocket server is running on port ${port}`);
}

// Function to update the current assistant ID
function updateAssistantId(newAssistantId) {
  currentAssistantId = newAssistantId;
}

module.exports = { startWebSocketServer, updateAssistantId };
