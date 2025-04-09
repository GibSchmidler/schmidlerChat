import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  bio: text("bio").default(""),
  avatarColor: text("avatar_color").default("#6366f1"), // Default indigo color
  avatarUrl: text("avatar_url"),
  theme: text("theme").default("light"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isPrivate: boolean("is_private").default(false).notNull(),
  recipientId: integer("recipient_id"),
  recipientUsername: text("recipient_username"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export const insertMessageSchema = createInsertSchema(messages, {
  isPrivate: () => z.boolean().optional().default(false),
  recipientId: () => z.number().optional().nullable(),
  recipientUsername: () => z.string().optional().nullable(),
}).pick({
  content: true,
  userId: true,
  isPrivate: true,
  recipientId: true,
  recipientUsername: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional(),
  avatarUrl: z.string()
    .refine(
      (val) => {
        // Allow empty values
        if (!val) return true;
        // Allow relative URLs starting with /uploads/
        if (val.startsWith('/uploads/')) return true;
        // Otherwise check for full URL
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      }, 
      { message: "Must be a valid URL or an uploaded image path" }
    )
    .optional().nullable(),
  theme: z.enum(["light", "dark"]).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
