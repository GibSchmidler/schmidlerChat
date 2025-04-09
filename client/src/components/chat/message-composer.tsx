import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@shared/schema";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full px-3 py-2 resize-none min-h-[40px] max-h-[120px]"
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
