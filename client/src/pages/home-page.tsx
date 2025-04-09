import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import ChatArea from "@/components/chat/chat-area";
import MessageComposer from "@/components/chat/message-composer";
import UserSidebar from "@/components/chat/user-sidebar";
import { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage extends Message {
  username: string;
  name: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [, navigate] = useLocation();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Fetch messages with automatic refresh (polling)
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Fetch users with online status
  const { data: onlineUsers = [] } = useQuery<{ id: number; status: "online" | "offline" }[]>({
    queryKey: ["/api/users"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Create a mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", { content });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate messages query to refresh the chat
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send your message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Function to handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      setIsSending(true);
      await sendMessageMutation.mutateAsync(content);
      return true;
    } catch (error) {
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Extract online user IDs
  const onlineUserIds = onlineUsers
    .filter(user => user.status === "online")
    .map(user => user.id);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        <UserSidebar 
          onlineUsers={onlineUserIds} 
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