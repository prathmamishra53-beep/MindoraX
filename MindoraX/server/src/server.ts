import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';

const PORT = process.env.PORT || 5000;

// Create http server wrapping Express
const httpServer = http.createServer(app);

// Attach Socket.IO
initSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

process.on('unhandledRejection', (err: any) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err: any) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
