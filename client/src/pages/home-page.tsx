import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/use-websocket";
import Header from "@/components/layout/header";
import ChatArea from "@/components/chat/chat-area";
import MessageComposer from "@/components/chat/message-composer";
import UserSidebar from "@/components/chat/user-sidebar";
import { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ChatMessage extends Message {
  username: string;
  name: string;
}

interface WebSocketMessage {
  type: "message" | "user_status" | "error";
  [key: string]: any;
}

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [, navigate] = useLocation();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Fetch initial messages
  const { data: initialMessages, isLoading: isLoadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
  });

  // Setup WebSocket connection only if user is logged in
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = user ? `${protocol}//${window.location.host}/ws?userId=${user.id}` : null;
  
  console.log("Connecting to WebSocket at:", wsUrl);
  
  const { isConnected, sendMessage, connectionError } = useWebSocket<WebSocketMessage>(wsUrl, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message") {
          setMessages(prev => [...prev, {
            id: data.id || Date.now(),
            content: data.content,
            userId: data.userId,
            timestamp: new Date(data.timestamp),
            username: data.username,
            name: data.name
          }]);
        } else if (data.type === "user_status") {
          const onlineUserIds = data.users
            .filter((u: any) => u.status === "online")
            .map((u: any) => u.id);
          setOnlineUsers(onlineUserIds);
        } else if (data.type === "error") {
          toast({
            title: "Error",
            description: data.error || "Something went wrong",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    onOpen: () => {
      console.log("WebSocket connected");
    },
    onClose: () => {
      console.log("WebSocket disconnected");
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server",
        variant: "destructive",
      });
    }
  });

  // Update messages when initial messages are loaded
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);
  
  // Show toast notification when connection error occurs
  useEffect(() => {
    if (connectionError) {
      console.error("WebSocket connection error:", connectionError);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [connectionError, toast]);

  // Send a message
  const handleSendMessage = async (content: string) => {
    if (!user) {
      console.error("Cannot send message: User not logged in");
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return false;
    }
    
    if (!isConnected) {
      console.error("Cannot send message: WebSocket not connected");
      toast({
        title: "Connection Error",
        description: "Not connected to chat server. Please refresh the page.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      setIsSending(true);
      console.log("Sending message:", content);
      const result = sendMessage({ content });
      console.log("Message sent successfully:", result);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to Send",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      
      {/* Connection status indicator */}
      <div className={`text-xs px-3 py-1 flex justify-end items-center gap-1 ${isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        {isConnected ? 'Connected to chat server' : 'Disconnected from chat server'}
      </div>
      
      <main className="flex-1 flex overflow-hidden">
        <UserSidebar 
          onlineUsers={onlineUsers} 
          currentUserId={user?.id}
        />
        
        <div className="flex-1 flex flex-col">
          <ChatArea 
            messages={messages} 
            currentUser={user} 
            isLoading={isLoadingMessages} 
          />
          
          <MessageComposer 
            onSendMessage={handleSendMessage} 
            isSubmitting={isSending}
            currentUser={user}
          />
        </div>
      </main>
    </div>
  );
}
