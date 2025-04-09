import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { User, Message } from "@shared/schema";

interface ChatMessage extends Message {
  username: string;
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  recipientUsername?: string | null;
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
      const defaultBgColor = message.avatarColor || colors[message.userId % colors.length];
      
      // Format timestamp
      const messageTime = new Date(message.timestamp);
      const formattedTime = format(messageTime, 'h:mm a');
      
      // Avatar component that works with both image and fallback
      const AvatarComponent = () => message.avatarUrl ? (
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
          <img 
            src={message.avatarUrl} 
            alt={message.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials on image error
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.classList.add('text-white', 'flex', 'items-center', 'justify-center');
              e.currentTarget.parentElement!.style.backgroundColor = defaultBgColor;
              e.currentTarget.parentElement!.innerHTML = `<span>${initials}</span>`;
            }}
          />
        </div>
      ) : (
        <div 
          className="w-8 h-8 rounded-full text-white flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: defaultBgColor }}
        >
          <span>{initials}</span>
        </div>
      );
      
      if (isSentByCurrentUser) {
        return (
          <div key={index} className="flex items-start justify-end space-x-2 mb-4">
            <div>
              <div className="flex items-end justify-end">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formattedTime}
                </span>
              </div>
              <div className={`message-bubble sent mt-1 py-2 px-3 rounded-[1rem_1rem_0_1rem] ${message.isPrivate ? 'bg-purple-600' : 'bg-primary'} text-white`}>
                {message.isPrivate && (
                  <div className="flex items-center mb-1 text-sm text-purple-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Private message</span>
                  </div>
                )}
                <p>{message.content}</p>
              </div>
            </div>
            <AvatarComponent />
          </div>
        );
      } else {
        return (
          <div key={index} className="flex items-start space-x-2 mb-4">
            <AvatarComponent />
            <div>
              <div className="flex items-end">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                  {message.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formattedTime}
                </span>
              </div>
              <div className={`message-bubble received mt-1 py-2 px-3 rounded-[1rem_1rem_1rem_0] ${message.isPrivate ? 'bg-purple-100 dark:bg-purple-900' : 'bg-gray-100 dark:bg-gray-700'} ${message.isPrivate ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100'}`}>
                {message.isPrivate && (
                  <div className="flex items-center mb-1 text-sm text-purple-600 dark:text-purple-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Private message to @{message.recipientUsername || "unknown"}</span>
                  </div>
                )}
                <p>{message.content}</p>
              </div>
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 h-full">
      {/* Chat header - fixed at top */}
      <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mr-2">
            {message?.isPrivate ? `Private Chat with @${message.recipientUsername}` : 'Chat Room'}
          </h2>
          <div className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Private messaging enabled</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
          Type @username at the start of your message to send privately
        </div>
      </div>
      
      {/* Scrollable messages container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          <div className="py-4"></div> {/* Extra spacing at the top */}
          {renderMessages()}
          <div className="py-4"></div> {/* Extra spacing at the bottom */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
