import type { WebSocket } from 'ws';

export interface Player {
  name: string;
  index: string;
  score: number;
  ws: WebSocket[];
  hasAnswered?: boolean;
  answerTime?: number;
  answeredCorrectly?: boolean;
}

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

export interface Game {
  id: string;
  code: string;
  hostId: string;
  hostWs: WebSocket | null;
  questions: Question[];
  players: Player[];
  currentQuestion: number;
  status: 'waiting' | 'in_progress' | 'finished';
  questionStartTime?: number;
  questionTimer?: NodeJS.Timeout;
  playerAnswers: Map<string, { answerIndex: number; timestamp: number }>;
}

export interface User {
  name: string;
  password: string;
  index: string;
  ws: WebSocket[];
}

export const MessageTypeUser = {
  REGISTRATION: 'reg',
  CONNECTION: 'connection',
  DISCONNECTION: 'disconnection',
} as const;

export const MessageTypeGame = {
  CREATE_GAME: 'create_game',
  CREATE_GAME_SUCCESS: 'game_created',
  JOIN_GAME: 'join_game',
  JOIN_GAME_SUCCESS: 'game_joined',
  PLAYER_JOIN: 'player_joined',
  UPDATE_PLAYERS: 'update_players',
} as const;

export const MessageTypeError = {
  ERROR: 'error',
} as const;

type MessageTypeKnown =
  | (typeof MessageTypeUser)[keyof typeof MessageTypeUser]
  | (typeof MessageTypeGame)[keyof typeof MessageTypeGame]
  | (typeof MessageTypeError)[keyof typeof MessageTypeError];

type MessageTypeUnknown = string;

export interface WSMessage {
  type: MessageTypeKnown | MessageTypeUnknown;
  data: any;
  id: number;
}

export interface RegData {
  name: string;
  password: string;
}

export interface CreateGameData {
  questions: Question[];
}

export interface JoinGameData {
  code: string;
}

export interface StartGameData {
  gameId: string;
}

export interface AnswerData {
  gameId: string;
  questionIndex: number;
  answerIndex: number;
}
