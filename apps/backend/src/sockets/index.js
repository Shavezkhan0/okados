/**
 * Socket.io Setup
 * @module sockets/index
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';

import { setupOrderSocketHandlers } from './order.socket.js';
import { setupNotificationSocketHandlers } from './notification.socket.js';
import { setupRestaurantSocketHandlers } from './restaurant.socket.js';
import { setupTrackingSocketHandlers } from './tracking.socket.js';

let io;

const logger = {
  info: (message, meta = {}) => console.log(`[SOCKET] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[SOCKET ERROR] ${message}`, meta),
  warn: (message, meta = {}) => console.warn(`[SOCKET WARNING] ${message}`, meta),
};

const ROOM_TYPES = {
  USER: 'user',
  RESTAURANT: 'restaurant',
  ORDER: 'order',
  ADMIN: 'admin',
  TRACKING: 'tracking',
};

const generateRoomName = (type, id) => {
  return `${type}:${id}`;
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    maxHttpBufferSize: 1e8,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      logger.warn('Socket connection attempt without token', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email phone role profile');

      if (!user) {
        logger.warn('Socket connection - user not found', { userId: decoded.id });
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        logger.warn('Socket connection - inactive user', { userId: decoded.id });
        return next(new Error('Account is deactivated'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.user = user;
      
      logger.info('Socket authenticated', { 
        socketId: socket.id, 
        userId: socket.userId, 
        role: socket.userRole 
      });

      next();
    } catch (err) {
      logger.error('Socket authentication failed', { error: err.message });
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id, userId: socket.userId });

    setupOrderSocketHandlers(socket);
    setupNotificationSocketHandlers(socket);
    setupRestaurantSocketHandlers(socket);
    setupTrackingSocketHandlers(socket);

    handleConnection(socket);

    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', { 
        socketId: socket.id, 
        userId: socket.userId, 
        reason 
      });
      handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      logger.error('Socket error', { socketId: socket.id, error: error.message });
    });
  });

  return io;
};

const handleConnection = async (socket) => {
  try {
    socket.join(generateRoomName(ROOM_TYPES.USER, socket.userId));
    logger.info('Joined user room', { userId: socket.userId });

    if (socket.userRole === 'restaurant') {
      const restaurant = await Restaurant.findOne({ ownerId: socket.userId });
      if (restaurant) {
        socket.restaurantId = restaurant._id.toString();
        socket.join(generateRoomName(ROOM_TYPES.RESTAURANT, restaurant._id));
        logger.info('Joined restaurant room', { userId: socket.userId, restaurantId: socket.restaurantId });
      }
    }

    if (socket.userRole === 'admin') {
      socket.join(ROOM_TYPES.ADMIN);
      logger.info('Joined admin room', { userId: socket.userId });
    }

    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Error in connection handler', { error: error.message });
  }
};

const handleDisconnection = async (socket) => {
  try {
    if (socket.restaurantId) {
      const restaurant = await Restaurant.findById(socket.restaurantId);
      if (restaurant) {
        const activeSockets = await io.in(generateRoomName(ROOM_TYPES.RESTAURANT, restaurant._id)).allSockets();
        if (activeSockets.size === 0) {
          io.to(generateRoomName(ROOM_TYPES.RESTAURANT, restaurant._id)).emit('restaurant:offline', {
            restaurantId: restaurant._id,
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error in disconnect handler', { error: error.message });
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  if (!io) return;
  
  const room = generateRoomName(ROOM_TYPES.USER, userId);
  io.to(room).emit(event, data);
  logger.info('Emitted to user', { userId, event });
};

const emitToRestaurant = (restaurantId, event, data) => {
  if (!io) return;
  
  const room = generateRoomName(ROOM_TYPES.RESTAURANT, restaurantId);
  io.to(room).emit(event, data);
  logger.info('Emitted to restaurant', { restaurantId, event });
};

const emitToOrder = (orderId, event, data) => {
  if (!io) return;
  
  const room = generateRoomName(ROOM_TYPES.ORDER, orderId);
  io.to(room).emit(event, data);
};

const emitToAdmin = (event, data) => {
  if (!io) return;
  
  io.to(ROOM_TYPES.ADMIN).emit(event, data);
  logger.info('Emitted to admin', { event });
};

const emitToRoom = (roomId, event, data) => {
  if (!io) return;
  
  io.to(roomId).emit(event, data);
  logger.info('Emitted to room', { roomId, event });
};

const broadcastToAll = (event, data) => {
  if (!io) return;
  
  io.emit(event, data);
};

const getConnectedUsers = () => {
  if (!io) return [];
  
  const users = [];
  io.sockets.sockets.forEach((socket) => {
    if (socket.userId) {
      users.push({
        socketId: socket.id,
        userId: socket.userId,
        role: socket.userRole,
      });
    }
  });
  return users;
};

const getRoomSockets = (roomId) => {
  if (!io) return [];
  
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []);
};

const isUserOnline = (userId) => {
  if (!io) return false;
  
  const room = generateRoomName(ROOM_TYPES.USER, userId);
  return io.sockets.adapter.rooms.has(room);
};

const getOnlineUsersCount = () => {
  if (!io) return 0;
  
  const rooms = io.sockets.adapter.rooms;
  let count = 0;
  rooms.forEach((sockets, roomName) => {
    if (roomName.startsWith('user:')) {
      count += sockets.size;
    }
  });
  return count;
};

export {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRestaurant,
  emitToOrder,
  emitToAdmin,
  emitToRoom,
  broadcastToAll,
  getConnectedUsers,
  getRoomSockets,
  isUserOnline,
  getOnlineUsersCount,
  ROOM_TYPES,
  generateRoomName,
};
