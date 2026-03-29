import { WebSocket } from 'ws';

const wsMap = new Map<WebSocket, number>();

//Prevent squashing important messages on React client-side
export const SAFE_DELAY = 30;

export const sendWs = (clients: WebSocket[], data: any, type: string) => {
  if (clients.length === 0) return;

  const dateNow = Date.now();
  const delay = clients.reduce((accumulator, currentClient) => {
    const lastSendTime = wsMap.get(currentClient) ?? 0;
    const currentDelay = Math.max(lastSendTime + SAFE_DELAY - dateNow, 0);
    return Math.max(accumulator, currentDelay);
  }, 0);

  const currentSendTime = dateNow + delay;
  clients.forEach((client) => {
    wsMap.set(client, currentSendTime);
  });

  const payload = JSON.stringify({
    type,
    data,
    id: 0,
  });

  setTimeout(() => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      } else {
        wsMap.delete(client);
      }
    });
  }, delay);
};
