import type { WebSocket } from 'ws';

export const sendWs = (wsClient: WebSocket, data: any, type: string) => {
  wsClient.send(
    JSON.stringify({
      type,
      data,
      id: 0,
    }),
  );
};
