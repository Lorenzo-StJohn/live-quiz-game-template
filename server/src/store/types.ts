import type { Game, Player, User } from '../types';

export interface State {
  users: User[];
  players: Player[];
  games: Game[];
}

export interface Action {
  type: string;
  data: any;
}

export type Reducer<T> = (state: T, action: Action) => T;

export type Listener<T> = (state: T) => void;
