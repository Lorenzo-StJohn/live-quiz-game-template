import { WebSocket } from 'ws';

const wsMap = new Map<WebSocket, number>();

//Prevent squashing important messages on React client-side
export const SAFE_DELAY = 30;

export const sendWs = (clients: WebSocket[], data: any, type: string) => {
  if (clients.length === 0) return;

  const dateNow = Date.now();
  const delay = clients.reduce((accumulator, currentClient) => {
    const lastSending = wsMap.get(currentClient) ?? 0;
    const currentDelay = Math.max(lastSending + SAFE_DELAY - dateNow, 0);
    return Math.max(accumulator, currentDelay);
  }, 0);

  const sendTime = dateNow + delay;
  clients.forEach((client) => {
    wsMap.set(client, sendTime);
  });

  setTimeout(() => {
    clients.forEach((client) => {
      const payload = JSON.stringify({
        type,
        data,
        id: 0,
      });
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      } else {
        wsMap.delete(client);
      }
    });
  }, delay);
};
