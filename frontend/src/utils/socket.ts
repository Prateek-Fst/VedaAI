import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected successfully to backend server!');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected from backend server.');
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

export const joinAssignmentRoom = (assignmentId: string) => {
  const s = getSocket();
  connectSocket();
  s.emit('join-assignment', assignmentId);
  console.log(`📡 Joining Socket Room for Assignment: ${assignmentId}`);
};
