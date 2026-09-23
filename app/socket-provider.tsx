'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getGameState } from '@/app/actions';

interface SocketContextType {
  socket: Socket | null;
  gameState: any;
  isConnected: boolean;
  refreshState: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  gameState: null,
  isConnected: false,
  refreshState: async () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const state = await getGameState();
      if (state) {
        setGameState((prev: any) => ({ ...prev, ...state }));
      }
    } catch (e) {
      // ignore fetch error
    }
  }, []);

  useEffect(() => {
    // Initial fetch to guarantee instant data
    refreshState();

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('gameStateUpdate', (state: any) => {
      if (state) {
        setGameState((prev: any) => ({ ...prev, ...state }));
      }
    });

    socketInstance.on('timerUpdate', (data: any) => {
      setGameState((prev: any) => {
        if (!prev) return prev;
        return { ...prev, timer_elapsed_seconds: data.elapsed, timer_duration: data.duration };
      });
    });

    setSocket(socketInstance);

    // Fallback polling every 2.5s to ensure synchronized state
    const interval = setInterval(refreshState, 2500);

    return () => {
      clearInterval(interval);
      socketInstance.disconnect();
    };
  }, [refreshState]);

  return (
    <SocketContext.Provider value={{ socket, gameState, isConnected, refreshState }}>
      {children}
    </SocketContext.Provider>
  );
};
