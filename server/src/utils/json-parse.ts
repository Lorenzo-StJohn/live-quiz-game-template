import type { WSMessage, RegData } from '../types';

const isWSMessage = (msg: unknown): msg is WSMessage => {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof msg.type === 'string' &&
    'id' in msg &&
    typeof msg.id === 'number' &&
    'data' in msg
  );
};

const isRegData = (data: unknown): data is RegData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof data.name === 'string' &&
    'password' in data &&
    typeof data.password === 'string'
  );
};

export const commonParse = (msg: any) => {
  const message = msg.toString();
  if (typeof message !== 'string') {
    return null;
  }
  try {
    const msg: unknown = JSON.parse(message.toString());
    if (!isWSMessage(msg)) {
      return null;
    }
    switch (msg.type) {
      case 'reg': {
        return registrationLoginParse(msg);
      }
      default: {
        return null;
      }
    }
  } catch (err) {
    return null;
  }
};

const registrationLoginParse = (message: WSMessage): WSMessage | null => {
  return isRegData(message.data) ? message : null;
};
