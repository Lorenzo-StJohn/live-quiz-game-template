import { WebSocket, WebSocketServer } from 'ws';
import 'dotenv/config';

import { ColorLog } from './utils/ColorLog';
import { Store } from './store/store';
import { userReducer } from './store/reducers/userReducer';
import {
  MessageTypeError,
  MessageTypeGame,
  MessageTypeUser,
  type User,
} from './types';
import { commonParse } from './utils/json-parse';
import { sendWs } from './utils/sendWs';
import type { GameState, UserState } from './store/types';
import { gameReducer } from './store/reducers/gameReducer';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const ERROR_MESSAGE = {
  message: 'Invalid request',
};
const USER_ERROR_MESSAGE = {
  message: 'Unknown user',
};
const ANONYM = 'anonym';

const wss = new WebSocketServer({ port: PORT });

ColorLog.primary(`🚀 WebSocket server starts on ws://localhost:${PORT}\n`);
if (PORT !== 3000) {
  ColorLog.warn(
    `🧨 Be aware that the client (React frontend) works only on port 3000. You need your own client to work with port ${PORT}.\n `,
  );
}

const userStore = new Store<UserState>(userReducer, {
  nameMap: new Map<string, User>(),
  socketMap: new Map<WebSocket, string>(),
});

let userState = userStore.getState();
userStore.subscribe((state) => (userState = state));

const gameStore = new Store<GameState>(gameReducer, new Map());

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
        const hostId = userState.nameMap.get(hostName)?.index;
        gameStore.dispatch({
          type: message.type,
          data: {
            questions: message.data.questions,
            hostId,
            wsClient,
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
