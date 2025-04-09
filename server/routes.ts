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
  
  // Broadcast helper function
  function broadcast(message: ChatMessage | UserStatusMessage) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Broadcast user status
  async function broadcastUserStatus() {
    const users = await storage.getAllUsers();
    const userStatuses = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      status: clients.has(user.id) ? "online" as const : "offline" as const
    }));
    
    broadcast({
      type: "user_status",
      users: userStatuses
    });
  }

  // Handle WebSocket connections
  wss.on("connection", async (ws, req) => {
    try {
      // Get the userId from the query parameter
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userIdStr = url.searchParams.get('userId');
      
      if (!userIdStr) {
        console.log("WebSocket connection rejected: No user ID provided");
        ws.close(1008, "Unauthorized - User ID required");
        return;
      }
      
      const userId = parseInt(userIdStr);
      console.log(`WebSocket connection attempt with userId: ${userId}`);
      
      if (isNaN(userId) || userId <= 0) {
        console.log(`WebSocket connection rejected: Invalid user ID: ${userIdStr}`);
        ws.close(1008, "Invalid user ID");
        return;
      }
      
      // Get all users from storage first (for debugging)
      const allUsers = await storage.getAllUsers();
      console.log(`Available users: ${JSON.stringify(allUsers.map(u => ({ id: u.id, username: u.username })))}`);
      
      // Get user from storage
      let user = await storage.getUser(userId);
      
      if (!user) {
        // Try to find the user in the list
        const matchingUser = allUsers.find(u => u.id === userId);
        
        if (matchingUser) {
          console.log(`Found user ${matchingUser.username} in all users collection, using that`);
          user = matchingUser;
        } else {
          console.log(`WebSocket connection rejected: User ID ${userId} not found in database`);
          ws.close(1008, "User not found");
          return;
        }
      }
      
      console.log(`WebSocket connection established for user: ${user.username} (${userId})`);
      
      // Store client connection
      clients.set(userId, ws);
      
      // Broadcast user status update
      await broadcastUserStatus();
      
      // Handle incoming messages
      ws.on("message", async (messageData) => {
        try {
          console.log(`Received message from ${user.username}:`, messageData.toString());
          const data = JSON.parse(messageData.toString());
          
          // Validate message content
          const result = insertMessageSchema.safeParse({
            content: data.content,
            userId: userId
          });
          
          if (!result.success) {
            console.log("Invalid message format:", result.error);
            ws.send(JSON.stringify({ 
              type: "error", 
              error: "Invalid message format" 
            }));
            return;
          }
          
          // Store the message
          const message = await storage.createMessage({
            content: data.content,
            userId: userId
          });
          
          console.log(`Stored message from ${user.username}: ${message.content}`);
          
          // Broadcast to all clients
          const broadcastMessage: ChatMessage = {
            type: "message",
            content: message.content,
            userId: message.userId,
            username: user.username,
            name: user.name,
            timestamp: message.timestamp
          };
          
          console.log("Broadcasting message to all clients:", broadcastMessage);
          broadcast(broadcastMessage);
          
        } catch (error) {
          console.error("Error processing message:", error);
          ws.send(JSON.stringify({ 
            type: "error", 
            error: "Failed to process message" 
          }));
        }
      });
      
      // Handle disconnection
      ws.on("close", async (code, reason) => {
        console.log(`WebSocket connection closed for ${user.username}. Code: ${code}, Reason: ${reason}`);
        clients.delete(userId);
        await broadcastUserStatus();
      });
      
      // Send a welcome message to confirm connection
      ws.send(JSON.stringify({
        type: "connection_success",
        message: `Welcome, ${user.name}! You are now connected to the chat.`
      }));
      
    } catch (error) {
      console.error("Error handling WebSocket connection:", error);
      ws.close(1011, "Server error");
    }
  });

  return httpServer;
}