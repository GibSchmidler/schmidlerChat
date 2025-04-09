import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface MessageComposerProps {
  onSendMessage: (content: string) => boolean | Promise<boolean>;
  isSubmitting?: boolean;
  currentUser?: User | null;
}

export default function MessageComposer({ 
  onSendMessage, 
  isSubmitting = false, 
  currentUser 
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showUsernameHelp, setShowUsernameHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Fetch users for the username helper
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const resizeTextarea = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    
    textarea.addEventListener("input", resizeTextarea);
    
    // Initial resize
    resizeTextarea();
    
    return () => {
      textarea.removeEventListener("input", resizeTextarea);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    if (!currentUser) {
      setError("You must be logged in to send messages");
      return;
    }
    
    try {
      setError(null);
      const success = await onSendMessage(message.trim());
      
      if (success) {
        setMessage("");
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      } else {
        setError("Failed to send message. Please try again.");
      }
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
      {/* Private messaging tip */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Type @username to send a private message</span>
        </div>
        
        <button 
          type="button"
          onClick={() => setShowUsernameHelp(prev => !prev)}
          className="text-xs text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
        >
          {showUsernameHelp ? 'Hide usernames' : 'Show usernames'}
        </button>
      </div>
      
      {/* Username helper */}
      {showUsernameHelp && (
        <div className="mb-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800 text-xs">
          <div className="font-medium mb-1 text-purple-700 dark:text-purple-300">Available usernames:</div>
          <div className="flex flex-wrap gap-2">
            {users?.map(user => (
              <button
                key={user.id}
                type="button"
                className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
                onClick={() => setMessage(prev => `@${user.username} ${prev.startsWith('@') ? prev.split(' ').slice(1).join(' ') : prev}`)}
              >
                @{user.username}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={message.startsWith('@') ? "Private message..." : "Type a message or @username for private..."}
            className={`w-full px-3 py-2 resize-none min-h-[40px] max-h-[120px] ${message.startsWith('@') ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
            disabled={isSubmitting || !currentUser}
            onKeyDown={(e) => {
              // Submit on Enter (without shift for new line)
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <Button 
          type="submit" 
          disabled={!message.trim() || isSubmitting || !currentUser}
          className="flex-shrink-0 h-10 w-10 p-2"
          size="icon"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
      {error && (
        <div className="mt-1 text-red-500 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
