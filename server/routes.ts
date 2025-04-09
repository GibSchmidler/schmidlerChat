import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertMessageSchema } from "@shared/schema";

interface ChatMessage {
  type: "message";
  content: string;
  userId: number;
  username: string;
  name: string;
  timestamp: Date;
}

interface UserStatusMessage {
  type: "user_status";
  users: Array<{
    id: number;
    username: string;
    name: string;
    status: "online" | "offline";
  }>;
}

// Track connected clients
const clients = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // API routes
  app.get("/api/messages", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const messages = await storage.getMessages(50); // Get last 50 messages
      
      // Enrich messages with user data
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            username: user?.username || "unknown",
            name: user?.name || "Unknown User",
          };
        })
      );
      
      res.json(enrichedMessages);
    } catch (error) {
      next(error);
    }
  });

  // Get all users
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const users = await storage.getAllUsers();
      const usersWithStatus = users.map(user => ({
        ...user,
        status: clients.has(user.id) ? "online" as const : "offline" as const
      }));
      
      res.json(usersWithStatus);
    } catch (error) {
      next(error);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  function broadcast(message: any) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  wss.on("connection", (ws, req) => {
    console.log("WebSocket connection received");
    
    // Extract user ID from query parameters
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userIdStr = url.searchParams.get('userId');
    const userId = userIdStr ? parseInt(userIdStr) : 0;
    
    if (!userId) {
      console.log("No user ID provided");
      return;
    }
    
    // Store the connection
    clients.set(userId, ws);
    console.log(`Client connection stored for user ${userId}`);
    
    // Handle messages
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("Received message:", message);
        
        if (message.content) {
          // Store in database
          const savedMessage = await storage.createMessage({
            content: message.content,
            userId
          });
          
          // Get user info
          const user = await storage.getUser(userId);
          
          if (user) {
            // Broadcast to all clients
            broadcast({
              type: "message",
              id: Date.now(),
              content: savedMessage.content,
              userId: savedMessage.userId,
              username: user.username,
              name: user.name,
              timestamp: savedMessage.timestamp
            });
          }
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });
    
    // Handle disconnection
    ws.on("close", () => {
      console.log(`WebSocket connection closed for user ${userId}`);
      clients.delete(userId);
      
      // Notify other clients
      broadcast({
        type: "user_status",
        users: Array.from(clients.keys()).map(id => ({
          id,
          status: "online"
        }))
      });
    });
    
    // Send confirmation message
    ws.send(JSON.stringify({
      type: "connection_success",
      message: "Connected to chat server"
    }));
    
    // Broadcast user status update
    broadcast({
      type: "user_status",
      users: Array.from(clients.keys()).map(id => ({
        id,
        status: "online"
      }))
    });
  });

  return httpServer;
}