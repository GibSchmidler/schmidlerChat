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
      status: clients.has(user.id) ? "online" : "offline"
    }));
    
    broadcast({
      type: "user_status",
      users: userStatuses
    });
  }

  wss.on("connection", async (ws, req) => {
    // Get the session ID from the request cookies
    const sessionCookie = req.headers.cookie?.split(';')
      .find(c => c.trim().startsWith('connect.sid='));

    if (!sessionCookie) {
      ws.close(1008, "Unauthorized");
      return;
    }
    
    // Parse user ID from session
    const sessionId = decodeURIComponent(sessionCookie.split('=')[1].split('.')[0]);
    const sessions = storage.sessionStore as any;
    
    sessions.get(sessionId, async (err: Error | null, session: any) => {
      if (err || !session || !session.passport || !session.passport.user) {
        ws.close(1008, "Session invalid");
        return;
      }
      
      const userId = session.passport.user;
      const user = await storage.getUser(userId);
      
      if (!user) {
        ws.close(1008, "User not found");
        return;
      }
      
      // Store client connection
      clients.set(userId, ws);
      
      // Broadcast user status update
      await broadcastUserStatus();
      
      // Handle messages
      ws.on("message", async (messageData) => {
        try {
          const data = JSON.parse(messageData.toString());
          
          // Validate message content
          const result = insertMessageSchema.safeParse({
            content: data.content,
            userId: userId
          });
          
          if (!result.success) {
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
          
          // Broadcast to all clients
          broadcast({
            type: "message",
            content: message.content,
            userId: message.userId,
            username: user.username,
            name: user.name,
            timestamp: message.timestamp
          });
          
        } catch (error) {
          console.error("Error processing message:", error);
          ws.send(JSON.stringify({ 
            type: "error", 
            error: "Failed to process message" 
          }));
        }
      });
      
      // Handle disconnection
      ws.on("close", async () => {
        clients.delete(userId);
        await broadcastUserStatus();
      });
    });
  });

  return httpServer;
}
