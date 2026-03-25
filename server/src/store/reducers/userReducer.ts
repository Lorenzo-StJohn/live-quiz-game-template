import type { WebSocket } from 'ws';
import { MessageTypeUser, type User } from '../../types';
import { ColorLog } from '../../utils/ColorLog';
import { sendWs } from '../../utils/sendWs';
import type { Reducer, UserState } from '../types';

const ERROR_MESSAGE = 'Wrong password';

export const userReducer: Reducer<UserState> = (state, action) => {
  switch (action.type) {
    case MessageTypeUser.CONNECTION: {
      ColorLog.secondary('☎️  New connection to server');
      return state;
    }

    case MessageTypeUser.REGISTRATION: {
      const name = action.data.name;
      const password = action.data.password;
      let index = `id${state.nameMap.size}`;
      let error = false;
      let errorText = '';
      const client: WebSocket = action.data.wsClient;

      if (state.socketMap.has(client)) {
        const oldName = state.socketMap.get(client)!;
        state.socketMap.delete(client);
        const oldUser = state.nameMap.get(oldName)!;
        oldUser.ws = oldUser.ws.filter((ws) => ws !== client);
      }

      const isRegistered = state.nameMap.has(name);

      if (!isRegistered) {
        const user: User = {
          name,
          password,
          index,
          ws: [client],
        };
        sendWs(
          client,
          { name, index, error, errorText },
          MessageTypeUser.REGISTRATION,
        );
        ColorLog.success(`🎭 Successful login for ${name}`);
        const nameMap = new Map([...state.nameMap, [name, user]]);
        state.socketMap.set(client, name);
        const socketMap = new Map(state.socketMap);
        return { nameMap, socketMap };
      }

      const userRegistered = state.nameMap.get(name)!;
      index = userRegistered.index;
      if (userRegistered.password === password) {
        sendWs(
          client,
          { name, index, error, errorText },
          MessageTypeUser.REGISTRATION,
        );
        ColorLog.success(`🎭 Successful login for ${name}`);
        userRegistered.ws.push(client);
        const nameMap = new Map(state.nameMap);
        state.socketMap.set(client, name);
        const socketMap = new Map(state.socketMap);
        return { nameMap, socketMap };
      }

      error = true;
      errorText = ERROR_MESSAGE;
      sendWs(
        client,
        { name, index, error, errorText },
        MessageTypeUser.REGISTRATION,
      );
      ColorLog.error('❌ Registration/login failed');
      const nameMap = new Map(state.nameMap);
      const socketMap = new Map(state.socketMap);
      return { nameMap, socketMap };
    }

    case MessageTypeUser.DISCONNECTION: {
      ColorLog.subtle('👻 Someone disconnected');
      const client: WebSocket = action.data.wsClient;
      const name = state.socketMap.get(client);
      if (!name) {
        return state;
      }
      const user = state.nameMap.get(name)!;
      user.ws = user.ws.filter((ws) => ws !== client);
      const nameMap = new Map(state.nameMap);
      state.socketMap.delete(client);
      const socketMap = new Map(state.socketMap);
      return { nameMap, socketMap };
    }

    default: {
      return state;
    }
  }
};
