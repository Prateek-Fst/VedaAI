import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Allow all for local MERN compatibility
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket client connected: ${socket.id}`);

    socket.on('join-assignment', (assignmentId: string) => {
      socket.join(assignmentId);
      console.log(`👤 Socket client ${socket.id} joined assignment room: ${assignmentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const emitAssignmentUpdate = (
  assignmentId: string,
  payload: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    message?: string;
    data?: any;
  }
) => {
  if (io) {
    io.to(assignmentId).emit('assignment-progress', payload);
  }
};
