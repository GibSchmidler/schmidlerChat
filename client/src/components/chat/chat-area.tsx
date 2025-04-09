import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { User, Message } from "@shared/schema";

interface ChatMessage extends Message {
  username: string;
  name: string;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  currentUser?: User | null;
  isLoading?: boolean;
}

export default function ChatArea({ messages, currentUser, isLoading = false }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const renderMessages = () => {
    if (isLoading) {
      return (
        <>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-2 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-60 rounded-md" />
              </div>
            </div>
          ))}
        </>
      );
    }
    
    if (messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            No messages yet. Be the first to send a message!
          </p>
        </div>
      );
    }
    
    return messages.map((message, index) => {
      const isSentByCurrentUser = currentUser && message.userId === currentUser.id;
      const initials = message.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase();
      
      // Get random background color based on user id for avatar
      const colors = ['bg-primary', 'bg-secondary', 'bg-accent'];
      const bgColor = colors[message.userId % colors.length];
      
      // Format timestamp
      const messageTime = new Date(message.timestamp);
      const formattedTime = format(messageTime, 'h:mm a');
      
      if (isSentByCurrentUser) {
        return (
          <div key={index} className="flex items-start justify-end space-x-2 mb-4">
            <div>
              <div className="flex items-end justify-end">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formattedTime}
                </span>
              </div>
              <div className="message-bubble sent mt-1 py-2 px-3 bg-primary text-white rounded-[1rem_1rem_0_1rem]">
                <p>{message.content}</p>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full ${bgColor} text-white flex items-center justify-center flex-shrink-0`}>
              <span>{initials}</span>
            </div>
          </div>
        );
      } else {
        return (
          <div key={index} className="flex items-start space-x-2 mb-4">
            <div className={`w-8 h-8 rounded-full ${bgColor} text-white flex items-center justify-center flex-shrink-0`}>
              <span>{initials}</span>
            </div>
            <div>
              <div className="flex items-end">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                  {message.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formattedTime}
                </span>
              </div>
              <div className="message-bubble received mt-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-[1rem_1rem_1rem_0]">
                <p>{message.content}</p>
              </div>
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <div className="md:hidden bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button className="p-1 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Group Chat</h2>
        <div className="w-6"></div> {/* Spacer for alignment */}
      </div>
      
      {/* Chat messages container */}
      <div className="flex-1 overflow-y-auto p-4 pt-6 pb-6 space-y-4 chat-container">
        <div className="py-4"></div> {/* Extra spacing at the top */}
        {renderMessages()}
        <div className="py-4"></div> {/* Extra spacing at the bottom */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
