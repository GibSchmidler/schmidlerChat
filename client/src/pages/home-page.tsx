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
  
  const { isConnected, sendMessage } = useWebSocket<WebSocketMessage>(wsUrl, {
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

  // Send a message
  const handleSendMessage = async (content: string) => {
    if (!user || !isConnected) return false;
    
    try {
      setIsSending(true);
      sendMessage({ content });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      
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
