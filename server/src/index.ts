import { type WebSocket, WebSocketServer } from 'ws';
import 'dotenv/config';

import { ColorLog } from './utils/ColorLog';
import { Store } from './store/store';
import { userReducer } from './store/reducers/userReducer';
import type { User } from './types';
import { commonParse } from './utils/json-parse';
import { sendWs } from './utils/sendWs';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const ERROR_MESSAGE = {
  message: 'Invalid request',
};

const wss = new WebSocketServer({ port: PORT });

ColorLog.primary(`🚀 WebSocket server starts on ws://localhost:${PORT}\n`);
if (PORT !== 3000) {
  ColorLog.warn(
    `🧨 Be aware that the client (React frontend) works only on port 3000. You need your own client to work with port ${PORT}.\n `,
  );
}

const userStore = new Store<User[]>(userReducer, []);

wss.on('connection', (wsClient: WebSocket) => {
  userStore.dispatch({ type: 'connection', data: null });

  wsClient.on('message', (msg: unknown) => {
    const message = commonParse(msg);
    if (!message) {
      return sendWs(wsClient, ERROR_MESSAGE, 'error');
    }
    switch (message.type) {
      case 'reg': {
        userStore.dispatch({
          type: 'reg',
          data: { ...message.data, wsClient },
        });
      }
    }
  });

  wsClient.once('close', () => {
    wsClient.removeAllListeners();
    userStore.dispatch({
      type: 'close',
      data: {
        wsClient,
      },
    });
  });
});
