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

  const connect = useCallback(() => {
    // Don't try to connect if URL is null
    if (!url) {
      setIsConnected(false);
      setConnectionError("WebSocket URL is null - user may not be authenticated");
      console.log("Cannot connect WebSocket: URL is null");
      return;
    }
    
    // Don't reconnect if there's already an active connection
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected, not reconnecting");
      return;
    }
    
    // Close any existing connections before creating a new one
    if (webSocketRef.current) {
      console.log("Closing existing WebSocket connection before reconnecting");
      webSocketRef.current.close();
    }

    // Clear any previous connection errors
    setConnectionError(null);
    
    try {
      console.log("Attempting WebSocket connection to:", url);
      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        console.log("WebSocket connection successful!");
        setIsConnected(true);
        setReconnectCount(0);
        if (onOpen) onOpen(event);
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed. Code:", event.code, "Reason:", event.reason);
        setIsConnected(false);
        if (onClose) onClose(event);

        // Try to reconnect if we haven't exceeded the reconnect attempts
        if (reconnectCount < reconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectCount + 1}/${reconnectAttempts})...`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            setReconnectCount((prevCount) => prevCount + 1);
            connect();
          }, reconnectInterval);
        } else {
          console.log("Maximum reconnection attempts reached");
          setConnectionError("Maximum reconnection attempts reached. Please refresh the page.");
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          console.log("Received WebSocket message:", parsedData.type);
          setLastMessage(parsedData);
        } catch (error) {
          console.error("WebSocket message parsing error:", error);
        }
        
        if (onMessage) onMessage(event);
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setConnectionError("WebSocket error occurred. Check console for details.");
        if (onError) onError(event);
      };

      webSocketRef.current = ws;
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setConnectionError(`Failed to create WebSocket connection: ${error}`);
      if (onError) onError(new Event('error'));
    }

    return () => {
      if (webSocketRef.current) {
        console.log("Closing WebSocket connection from cleanup function");
        webSocketRef.current.close();
      }
    };
  }, [url, onOpen, onClose, onMessage, onError, reconnectCount, reconnectAttempts, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (!webSocketRef.current) {
      console.error("Cannot send message: WebSocket not initialized");
      return false;
    }
    
    if (webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket not open. Current state:", webSocketRef.current.readyState);
      return false;
    }
    
    try {
      console.log("Sending WebSocket message:", data);
      webSocketRef.current.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
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