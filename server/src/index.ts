import { WebSocketServer } from 'ws';
import 'dotenv/config';
import { ColorLog } from './utils/ColorLog';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const wss = new WebSocketServer({ port: PORT });

ColorLog.primary(`🚀 WebSocket server starts on ws://localhost:${PORT}\n`);
if (PORT !== 3000) {
  ColorLog.warn(
    `🧨 Be aware that the client (React frontend) works only on port 3000. You need your own client to work with port ${PORT}.\n `,
  );
}
