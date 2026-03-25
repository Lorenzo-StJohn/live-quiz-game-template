import type { User } from '../../types';
import { ColorLog } from '../../utils/ColorLog';
import { sendWs } from '../../utils/sendWs';
import type { Reducer } from '../types';

const CONNECTION = 'connection';
const DISCONNECTION = 'disconnection';
const REG = 'reg';

const ERROR_MESSAGE = 'Wrong password';

export const userReducer: Reducer<User[]> = (state, action) => {
  switch (action.type) {
    case CONNECTION: {
      ColorLog.secondary('☎️  New connection to server');
      return state;
    }

    case REG: {
      const name = action.data.name;
      const password = action.data.password;
      let index = `id${state.length}`;
      let error = false;
      let errorText = '';
      const client = action.data.wsClient;

      const userFound = state.find((user) => user.name === name);

      if (!userFound) {
        const user: User = {
          name,
          password,
          index,
          ws: client,
        };
        sendWs(client, { name, index, error, errorText }, REG);
        ColorLog.success(`🎭 Successful login for ${name}`);
        return [...state, user];
      }

      index = userFound.index;
      if (userFound.password === password) {
        sendWs(client, { name, index, error, errorText }, REG);
        const userLogOut = state.find((user) => user.name === name && !user.ws);

        if (userLogOut) {
          userLogOut.ws = client;
          ColorLog.success(`🎭 Successful login for ${name}`);
          return [...state];
        }

        ColorLog.success(`🎭 Successful login for ${name}`);
        return [...state, { name, password, index, ws: client }];
      }

      error = true;
      errorText = ERROR_MESSAGE;
      sendWs(client, { name, index, error, errorText }, REG);
      ColorLog.error('❌ Registration/login failed');
      return state;
    }

    case DISCONNECTION: {
      ColorLog.subtle('👻 Someone disconnected');
      const userFound = state.find((user) => user.ws === action.data.wsClient);
      if (!userFound) {
        return state;
      }
      delete userFound.ws;
      return [...state];
    }

    default: {
      return state;
    }
  }
};
