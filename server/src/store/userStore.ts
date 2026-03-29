import type { WebSocket } from 'ws';

import type { User } from '../types.js';
import { userReducer } from './reducers/userReducer.js';
import type { UserState } from './types.js';
import { Store } from './Store.js';

export const userStore = new Store<UserState>(userReducer, {
  nameMap: new Map<string, User>(),
  socketMap: new Map<WebSocket, string>(),
});
