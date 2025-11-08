const WebSocket = require("ws");
const http = require("http");

class WebServer {
  constructor(bridge) {
    this.bridge = bridge;
    this.config = bridge.config.web ?? {};
    this.port = this.config.port ?? 1439;
    this.start = Date.now();
    this.server = null;
    this.wss = null;
    this.botMessageListener = null;
    this.clients = new Set();
  }

  async connect() {
    if (this.config.enabled !== true) return;

    const bot = this.bridge.minecraft.bot;
    if (!bot) {
      return;
    }

    this.server = http.createServer();
    this.wss = new WebSocket.Server({ noServer: true });

    // Create a single bot message listener that broadcasts to all clients
    this.botMessageListener = (message) => {
      const messageStr = JSON.stringify(message);
      this.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(messageStr);
          } catch (error) {
            // Client disconnected, remove from set
            this.clients.delete(ws);
          }
        } else {
          this.clients.delete(ws);
        }
      });
    };

    bot.on("message", this.botMessageListener);

    this.wss.on("connection", (ws) => {
      console.web("Client has connected to the server.");
      this.clients.add(ws);

      ws.on("message", (message) => {
        try {
          message = JSON.parse(message);
          if (typeof message !== "object") {
            return;
          }

          if (message.type === "message" && message.token === this.config.token && message.data) {
            console.web(`Received: ${JSON.stringify(message)}`);
            bot.chat(message.data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        console.web("Client has disconnected from the server.");
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });
    });

    this.server.on("upgrade", (request, socket, head) => {
      if (request.url === "/message") {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit("connection", ws, request);
        });
      }
    });

    this.server.listen(this.port, () => {
      console.web(`WebSocket running at http://localhost:${this.port}/`);
    });

    this.server.on("request", (req, res) => {
      if (req.url === "/uptime") {
        res.end(
          JSON.stringify({
            success: true,
            uptime: Date.now() - this.start
          })
        );
      } else {
        res.end(
          JSON.stringify({
            success: false,
            error: "Invalid route"
          })
        );
      }
    });
  }

  cleanup() {
    // Remove bot message listener
    if (this.bridge.minecraft.bot && this.botMessageListener) {
      try {
        this.bridge.minecraft.bot.removeListener("message", this.botMessageListener);
      } catch (error) {
        // Ignore cleanup errors
      }
      this.botMessageListener = null;
    }

    // Close all WebSocket connections
    this.clients.forEach((ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      try {
        this.wss.close();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.wss = null;
    }

    // Close HTTP server
    if (this.server) {
      try {
        this.server.close();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.server = null;
    }
  }
}

module.exports = WebServer;
