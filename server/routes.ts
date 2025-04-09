import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // API routes for messages
  app.get("/api/messages", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      // Parse limit parameter, default to 50 if not provided
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Get messages from storage
      const messages = await storage.getMessages(limit);
      
      // Enrich messages with user data
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            username: user?.username || "unknown",
            name: user?.name || "Unknown User",
            avatarUrl: user?.avatarUrl,
            avatarColor: user?.avatarColor,
          };
        })
      );
      
      res.json(enrichedMessages);
    } catch (error) {
      next(error);
    }
  });

  // Create a new message
  app.post("/api/messages", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      // Validate request body
      const result = insertMessageSchema.safeParse({
        content: req.body.content,
        userId: req.user!.id
      });
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid message format",
          details: result.error.errors
        });
      }
      
      // Create message in storage
      const message = await storage.createMessage({
        content: req.body.content,
        userId: req.user!.id
      });
      
      // Return message with user info
      const user = req.user!;
      res.status(201).json({
        ...message,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor
      });
    } catch (error) {
      next(error);
    }
  });

  // Note: /api/users endpoint is already defined in auth.ts

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}