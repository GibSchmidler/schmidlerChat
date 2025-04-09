import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertMessageSchema, updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import { upload, handleAvatarUpload, serveStaticUploads } from "./upload";

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
      
      // Get messages from storage, filtered for current user
      const messages = await storage.getMessages(limit, req.user!.id);
      
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

      // Check if message contains @username mentions for private messaging
      let isPrivate = false;
      let recipientId = null;
      let recipientUsername = null;
      let content = req.body.content;
      
      // Make username comparison case-insensitive
      // Check for @username pattern at the beginning of the message
      const atMentionRegex = /^@(\w+)\s(.+)$/;
      const mentionMatch = content.match(atMentionRegex);
      
      if (mentionMatch) {
        const mentionedUsername = mentionMatch[1];
        const actualMessage = mentionMatch[2];
        
        // Case-insensitive username lookup
        const mentionedUser = await storage.getUserByUsername(
          mentionedUsername.toLowerCase()
        ) || await storage.getUserByUsername(mentionedUsername);
        
        if (mentionedUser) {
          console.log(`Private message detected to ${mentionedUser.username}`);
          isPrivate = true;
          recipientId = mentionedUser.id;
          recipientUsername = mentionedUser.username;
          
          // Remove the @username prefix from the content
          content = actualMessage;
        }
      }
      
      // Validate request body
      const result = insertMessageSchema.safeParse({
        content: content,
        userId: req.user!.id,
        isPrivate: isPrivate,
        recipientId: recipientId
      });
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid message format",
          details: result.error.errors
        });
      }
      
      // Create message in storage
      const message = await storage.createMessage({
        content: content,
        userId: req.user!.id,
        isPrivate: isPrivate,
        recipientId: recipientId,
        recipientUsername: recipientUsername
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
  
  // Update user profile
  app.patch("/api/user/profile", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      // Validate request body
      const result = updateProfileSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid profile data",
          details: result.error.errors
        });
      }
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(req.user!.id, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update session
      req.login(updatedUser, (err) => {
        if (err) return next(err);
        res.json(updatedUser);
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Handle avatar upload
  app.post("/api/user/avatar", upload.single("avatar"), handleAvatarUpload);
  
  // Serve static uploads
  app.get("/uploads/:filename", serveStaticUploads);
  
  // Get all users (for the sidebar)
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });
  
  // Delete a user by username (admin-only endpoint)
  app.delete("/api/admin/users/:username", async (req, res, next) => {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      const success = await storage.deleteUserByUsername(username);
      
      if (success) {
        res.status(200).json({ message: `User "${username}" deleted successfully` });
      } else {
        res.status(404).json({ error: `User "${username}" not found` });
      }
    } catch (error) {
      next(error);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}