import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage<T> = {
  data: T;
  type: string;
};

export function useWebSocket<T = any>(
  url: string,
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
    // Don't reconnect if there's already an active connection
    if (webSocketRef.current?.readyState === WebSocket.OPEN) return;
    
    // Close any existing connections before creating a new one
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

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
      if (onError) onError(event);
    };

    webSocketRef.current = ws;

    return () => {
      console.log("Closing WebSocket connection from cleanup function");
      ws.close();
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
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnectCount,
  };
}
