// src/hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useSocket(handlers: Record<string, (data: any) => void>) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(API_BASE, { withCredentials: true });
    socketRef.current = socket;
    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}