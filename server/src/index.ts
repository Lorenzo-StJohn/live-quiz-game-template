import { WebSocket, WebSocketServer } from 'ws';
import 'dotenv/config';

import { ColorLog } from './utils/ColorLog';
import { MessageTypeError, MessageTypeGame, MessageTypeUser } from './types';
import { commonParse } from './utils/json-parse';
import { sendWs } from './utils/sendWs';
import { userStore } from './store/userStore';
import { gameService } from './services/gameService';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const ERROR_MESSAGE = {
  message: 'Invalid request',
};

const ANONYM = 'anonym';
const USER_ERROR_MESSAGE = {
  message: 'Unknown user',
};

export const wss = new WebSocketServer({ port: PORT });

ColorLog.primary(`🚀 WebSocket server starts on ws://localhost:${PORT}\n`);
if (PORT !== 3000) {
  ColorLog.warn(
    `🧨 Be aware that the client (React frontend) works only on port 3000. You need your own client to work with port ${PORT}.\n `,
  );
}

let userState = userStore.getState();
userStore.subscribe((state) => (userState = state));

wss.on('connection', (wsClient: WebSocket) => {
  userStore.dispatch({ type: MessageTypeUser.CONNECTION, data: null });

  wsClient.on('message', (msg: unknown) => {
    const message = commonParse(msg);
    if (!message) {
      const name = userState.socketMap.get(wsClient) ?? ANONYM;
      ColorLog.error(`❌ Wrong request from ${name}`);
      return sendWs(wsClient, ERROR_MESSAGE, MessageTypeError.ERROR);
    }

    switch (message.type) {
      case MessageTypeUser.REGISTRATION: {
        userStore.dispatch({
          type: MessageTypeUser.REGISTRATION,
          data: { ...message.data, wsClient },
        });
        break;
      }

      case MessageTypeGame.CREATE_GAME: {
        const hostName = userState.socketMap.get(wsClient);
        if (!hostName) {
          return sendWs(wsClient, USER_ERROR_MESSAGE, MessageTypeError.ERROR);
        }

        const hostId = userState.nameMap.get(hostName)!.index;

        gameService.createGame({
          type: MessageTypeGame.CREATE_GAME,
          data: {
            questions: message.data.questions,
            wsClient,
            hostId,
          },
        });
        break;
      }

      case MessageTypeGame.JOIN_GAME: {
        const name = userState.socketMap.get(wsClient);
        if (!name) {
          return sendWs(wsClient, USER_ERROR_MESSAGE, MessageTypeError.ERROR);
        }
        const index = userState.nameMap.get(name)!.index;

        gameService.joinGame({
          type: MessageTypeGame.JOIN_GAME,
          data: {
            wsClient,
            code: message.data.code,
            name,
            index,
          },
        });
      }
    }
  });

  wsClient.once('close', () => {
    wsClient.removeAllListeners();
    userStore.dispatch({
      type: MessageTypeUser.DISCONNECTION,
      data: {
        wsClient,
      },
    });
    gameService.handleDisconnect({
      type: MessageTypeUser.DISCONNECTION,
      data: {
        wsClient,
      },
    });
  });
});

function gracefulShutdown() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.terminate();
    }
  });

  wss.close(() => {
    ColorLog.tertiary(
      '\n🔌 WebSocket server closed. Thank you for using our service ♥',
    );
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
