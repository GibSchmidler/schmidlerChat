import { type User, type InsertUser, type Message, type InsertMessage, type UpdateProfile } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";

const MemoryStore = createMemoryStore(session);

// Define file paths for data persistence
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: number, profileData: UpdateProfile): Promise<User | undefined>;
  deleteUserByUsername(username: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(limit?: number, currentUserId?: number): Promise<Message[]>;
  
  // Session store
  sessionStore: session.Store;
}

// File-based persistent storage implementation
export class FileStorage implements IStorage {
  private users: User[] = [];
  private messages: Message[] = [];
  private nextUserId = 1;
  private nextMessageId = 1;
  public sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h, prune expired entries
    });
    
    // Load existing data from files
    this.loadData();
  }
  
  private loadData() {
    try {
      // Load users if file exists
      if (fs.existsSync(USERS_FILE)) {
        const userData = fs.readFileSync(USERS_FILE, 'utf8');
        this.users = JSON.parse(userData);
        
        // Find the highest user ID to set nextUserId correctly
        if (this.users.length > 0) {
          const maxId = Math.max(...this.users.map(user => user.id));
          this.nextUserId = maxId + 1;
        }
        
        console.log(`Loaded ${this.users.length} users from storage`);
      }
      
      // Load messages if file exists
      if (fs.existsSync(MESSAGES_FILE)) {
        const messageData = fs.readFileSync(MESSAGES_FILE, 'utf8');
        const rawMessages = JSON.parse(messageData);
        
        // Convert timestamp strings back to Date objects
        this.messages = rawMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        // Find the highest message ID to set nextMessageId correctly
        if (this.messages.length > 0) {
          const maxId = Math.max(...this.messages.map(msg => msg.id));
          this.nextMessageId = maxId + 1;
        }
        
        console.log(`Loaded ${this.messages.length} messages from storage`);
      }
    } catch (error) {
      console.error('Error loading data from files:', error);
    }
  }
  
  private saveUsers() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users to file:', error);
    }
  }
  
  private saveMessages() {
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(this.messages, null, 2));
    } catch (error) {
      console.error('Error saving messages to file:', error);
    }
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const newUser: User = {
      ...insertUser,
      id: this.nextUserId++,
      bio: "",
      avatarColor: "#6366f1", // Default indigo color
      avatarUrl: null,
      theme: "light"
    };
    this.users.push(newUser);
    
    // Save users to file
    this.saveUsers();
    
    return newUser;
  }
  
  async updateUserProfile(userId: number, profileData: UpdateProfile): Promise<User | undefined> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      return undefined;
    }
    
    // Update user with new profile data
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...profileData
    };
    
    // Save users to file
    this.saveUsers();
    
    return this.users[userIndex];
  }
  
  async deleteUserByUsername(username: string): Promise<boolean> {
    const initialLength = this.users.length;
    
    // Filter out the user with the matching username
    this.users = this.users.filter(user => user.username !== username);
    
    // If a user was removed, save the updated users list
    if (this.users.length < initialLength) {
      // Save users to file
      this.saveUsers();
      return true;
    }
    
    return false;
  }
  
  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      ...insertMessage,
      id: this.nextMessageId++,
      timestamp: new Date(),
      isPrivate: insertMessage.isPrivate || false,
      recipientId: insertMessage.recipientId || null
    };
    this.messages.push(newMessage);
    
    // Save messages to file
    this.saveMessages();
    
    return newMessage;
  }
  
  async getMessages(limit?: number, currentUserId?: number): Promise<Message[]> {
    // Sort messages by timestamp in ascending order (oldest first)
    const sortedMessages = [...this.messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Filter messages based on visibility permissions
    const visibleMessages = currentUserId 
      ? sortedMessages.filter(msg => 
          // Include if message is not private
          !msg.isPrivate || 
          // Include if user is the sender
          msg.userId === currentUserId ||
          // Include if user is the recipient
          msg.recipientId === currentUserId
        )
      : sortedMessages.filter(msg => !msg.isPrivate); // Only public messages for non-logged in users
    
    if (limit) {
      return visibleMessages.slice(-limit); // Get the most recent messages if limit is specified
    }
    
    return visibleMessages;
  }
}

export const storage = new FileStorage();