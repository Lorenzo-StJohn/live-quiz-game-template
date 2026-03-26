import type { WebSocket } from 'ws';

import type { User } from '../types';
import { userReducer } from './reducers/userReducer';
import type { UserState } from './types';
import { Store } from './Store';

export const userStore = new Store<UserState>(userReducer, {
  nameMap: new Map<string, User>(),
  socketMap: new Map<WebSocket, string>(),
});
