import { WebSocket } from 'ws';
import type { User } from '../../types';
import { ColorLog } from '../../utils/ColorLog';
import { sendWs } from '../../utils/sendWs';
import type { Reducer } from '../types';

const CONNECTION = 'connection';
const DISCONNECTION = 'disconnection';
const REG = 'reg';

const ERROR_MESSAGE = 'Wrong password';

const clientNameMap = new Map<WebSocket, string>();

export const userReducer: Reducer<Map<string, User>> = (state, action) => {
  switch (action.type) {
    case CONNECTION: {
      ColorLog.secondary('☎️  New connection to server');
      return state;
    }

    case REG: {
      const name = action.data.name;
      const password = action.data.password;
      let index = `id${state.size}`;
      let error = false;
      let errorText = '';
      const client = action.data.wsClient;

      const isRegistered = state.has(name);

      if (!isRegistered) {
        const user: User = {
          name,
          password,
          index,
          ws: [client],
        };
        sendWs(client, { name, index, error, errorText }, REG);
        ColorLog.success(`🎭 Successful login for ${name}`);
        return new Map([...state, [name, user]]);
      }

      const userRegistered = state.get(name)!;
      index = userRegistered.index;
      if (userRegistered.password === password) {
        sendWs(client, { name, index, error, errorText }, REG);
        userRegistered.ws.push(client);
        clientNameMap.set(client, name);
        ColorLog.success(`🎭 Successful login for ${name}`);
        return new Map(state);
      }

      error = true;
      errorText = ERROR_MESSAGE;
      sendWs(client, { name, index, error, errorText }, REG);
      ColorLog.error('❌ Registration/login failed');
      return state;
    }

    case DISCONNECTION: {
      ColorLog.subtle('👻 Someone disconnected');
      const name = clientNameMap.get(action.data.wsClient);
      if (!name) {
        return state;
      }
      const user = state.get(name)!;
      user.ws = user.ws.filter((ws) => ws !== action.data.wsClient);
      return new Map(state);
    }

    default: {
      return state;
    }
  }
};
