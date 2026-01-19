import { useEffect, useRef, useState } from 'react';

const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8000';

// WebSocket service for real-time collaboration
class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.listeners = {};
  }

  connect(documentId, userId) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve(this.socket);
        return;
      }

      const socketUrl = `${WEBSOCKET_URL}/ws/collaboration/${documentId}?userId=${userId}`;
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('WebSocket connected');
        
        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.send(message);
        }
        
        resolve(this.socket);
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason);
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect(documentId, userId).then(resolve).catch(reject);
          }, this.reconnectDelay);
        } else {
          reject(new Error('Max reconnection attempts reached'));
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  send(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(
        (cb) => cb !== callback
      );
    }
  }

  handleMessage(message) {
    if (message.type && this.listeners[message.type]) {
      this.listeners[message.type].forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      });
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export const useWebSocket = (documentId, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!documentId || !userId) return;

    const connect = async () => {
      try {
        await websocketService.connect(documentId, userId);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setError(err.message);
        setIsConnected(false);
      }
    };

    connect();

    const handleConnectionChange = () => {
      setIsConnected(websocketService.isConnected());
    };

    // Listen for connection state changes
    websocketService.on('connection', handleConnectionChange);

    return () => {
      websocketService.off('connection', handleConnectionChange);
      websocketService.disconnect();
    };
  }, [documentId, userId]);

  return {
    isConnected,
    error,
    sendMessage: (message) => websocketService.send(message),
    onMessage: (eventType, callback) => websocketService.on(eventType, callback),
    offMessage: (eventType, callback) => websocketService.off(eventType, callback),
  };
};

export default websocketService;
