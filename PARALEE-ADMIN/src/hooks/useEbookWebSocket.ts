import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = `${import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8060'}/ws/ebook`;

interface WebSocketMessage {
  type: 'new_job' | 'job_updated' | 'job_completed' | 'job_failed';
  jobId: number;
  data?: {
    book?: string;
    book_title?: string;
    author?: string;
    user_id?: number;
    final_copy?: string;
    error?: string;
  };
}

interface UseEbookWebSocketOptions {
  onNewJob?: (jobId: number, jobData: WebSocketMessage['data']) => void;
  onJobCompleted?: (jobId: number, finalCopy: string) => void;
  onJobFailed?: (jobId: number, error: string) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useEbookWebSocket(options: UseEbookWebSocketOptions = {}) {
  const {
    onNewJob,
    onJobCompleted,
    onJobFailed,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[WS] Connecting to', WS_URL);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setIsConnected(false);
      wsRef.current = null;

      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WS] Reconnecting...');
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('[WS] Received:', message);
        setLastMessage(message);

        switch (message.type) {
          case 'new_job':
            if (onNewJob && message.jobId) {
              onNewJob(message.jobId, message.data);
            }
            break;
          case 'job_completed':
            if (onJobCompleted && message.jobId && message.data?.final_copy) {
              onJobCompleted(message.jobId, message.data.final_copy);
            }
            break;
          case 'job_failed':
            if (onJobFailed && message.jobId) {
              onJobFailed(message.jobId, message.data?.error || 'Unknown error');
            }
            break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    wsRef.current = ws;
  }, [autoReconnect, reconnectInterval, onNewJob, onJobCompleted, onJobFailed]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Not connected, cannot send message');
    }
  }, []);

  const notifyJobCompleted = useCallback((jobId: number, finalCopy: string) => {
    sendMessage({
      type: 'job_completed',
      jobId,
      data: { final_copy: finalCopy },
    });
  }, [sendMessage]);

  const notifyJobFailed = useCallback((jobId: number, error: string) => {
    sendMessage({
      type: 'job_failed',
      jobId,
      data: { error },
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    notifyJobCompleted,
    notifyJobFailed,
  };
}