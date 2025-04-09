import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";

// Create database connection
export const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

// Create DB schema
export async function initializeDb() {
  console.log("Checking if database tables exist...");
  try {
    // Check if users table exists
    const userTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `;
    
    if (!userTable[0].exists) {
      console.log("Creating users table...");
      await sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL
        );
      `;
    } else {
      console.log("Users table already exists.");
    }

    // Check if messages table exists
    const messagesTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'messages'
      );
    `;

    if (!messagesTable[0].exists) {
      console.log("Creating messages table...");
      await sql`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `;
    } else {
      console.log("Messages table already exists.");
    }

    console.log("Database initialization complete.");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}