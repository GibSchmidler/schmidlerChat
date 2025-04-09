import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage<T> = {
  data: T;
  type: string;
};

export function useWebSocket<T = any>(
  url: string | null,
  options: {
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onMessage?: (event: MessageEvent) => void;
    onError?: (event: Event) => void;
    reconnectInterval?: number;
    reconnectAttempts?: number;
  } = {}
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
  } = options;

  // Create and connect to WebSocket
  const connect = useCallback(() => {
    // Don't try to connect if URL is null
    if (!url) {
      setIsConnected(false);
      setConnectionError("No WebSocket URL provided");
      return () => {};
    }
    
    // Don't reconnect if there's already an active connection
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      return () => {};
    }
    
    // Close any existing connections before creating a new one
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    // Clear any previous connection errors
    setConnectionError(null);
    
    console.log("Connecting to WebSocket at:", url);
    
    // Create new WebSocket connection
    const ws = new WebSocket(url);
    webSocketRef.current = ws;
    
    // Configure event handlers
    ws.onopen = (event) => {
      console.log("WebSocket connection opened");
      setIsConnected(true);
      setReconnectCount(0);
      
      if (onOpen) onOpen(event);
    };
    
    ws.onclose = (event) => {
      console.log("WebSocket connection closed with code:", event.code, "reason:", event.reason);
      setIsConnected(false);
      
      if (onClose) onClose(event);
      
      // Only attempt to reconnect if this was not a normal closure
      if (event.code !== 1000 && event.code !== 1001) {
        if (reconnectCount < reconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectCount + 1}/${reconnectAttempts})...`);
          const timeoutId = window.setTimeout(() => {
            setReconnectCount((prevCount) => prevCount + 1);
          }, reconnectInterval);
          reconnectTimeoutRef.current = timeoutId;
        } else {
          console.log("Maximum reconnection attempts reached");
          setConnectionError("Failed to connect after maximum attempts. Please refresh the page.");
        }
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        console.log("Received WebSocket message:", parsedData);
        setLastMessage(parsedData);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
      
      if (onMessage) onMessage(event);
    };
    
    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setConnectionError("Connection error occurred");
      
      if (onError) onError(event);
    };
    
    // Return cleanup function
    return () => {
      console.log("Cleaning up WebSocket connection");
      ws.close();
    };
  }, [url, onOpen, onClose, onMessage, onError, reconnectCount, reconnectAttempts, reconnectInterval]);

  // Connect when URL changes or reconnect count increases
  useEffect(() => {
    const cleanup = connect();
    
    return () => {
      cleanup();
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, reconnectCount]);

  // Send a message over the WebSocket
  const sendMessage = useCallback((data: any) => {
    if (!webSocketRef.current) {
      console.error("Cannot send message: WebSocket not initialized");
      return false;
    }
    
    if (webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket not open", webSocketRef.current.readyState);
      return false;
    }
    
    try {
      console.log("Sending message:", data);
      webSocketRef.current.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnectCount,
    connectionError,
  };
}