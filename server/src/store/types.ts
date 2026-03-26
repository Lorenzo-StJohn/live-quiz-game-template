import { WebSocket } from 'ws';
import type { User } from '../types';

export interface Action {
  type: string;
  data: any;
}

export type Reducer<T> = (state: T, action: Action) => T;

export type Listener<T> = (state: T, action: Action) => void;

export interface UserState {
  nameMap: Map<string, User>;
  socketMap: Map<WebSocket, string>;
}
