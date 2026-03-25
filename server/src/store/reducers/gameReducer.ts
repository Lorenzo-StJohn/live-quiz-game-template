import type { WebSocket } from 'ws';

import {
  MessageTypeGame,
  type Game,
  type Player,
  type Question,
} from '../../types';
import { generateCode } from '../../utils/generateCode';
import type { GameState, Reducer } from '../types';
import { sendWs } from '../../utils/sendWs';
import { ColorLog } from '../../utils/ColorLog';

const codeSet = new Set<string>();

export const gameReducer: Reducer<GameState> = (state, action) => {
  switch (action.type) {
    case MessageTypeGame.CREATE_GAME: {
      const id = `game${state.size}`;
      let code = generateCode(6);
      while (codeSet.has(code)) {
        code = generateCode(6);
      }
      const hostId: string = action.data.hostId;
      const questions: Question[] = action.data.questions;
      const players: Player[] = [];
      const currentQuestion = 0;
      const status: Game['status'] = 'waiting';
      const playerAnswers: Game['playerAnswers'] = new Map();

      const client: WebSocket = action.data.wsClient;
      sendWs(client, { gameId: id, code }, MessageTypeGame.CREATE_GAME_SUCCESS);
      ColorLog.primary(
        `🎲 A new game successfully created. Use the invitation code: ${code}`,
      );

      return new Map([
        ...state,
        [
          code,
          {
            id,
            code,
            hostId,
            questions,
            players,
            currentQuestion,
            status,
            playerAnswers,
          },
        ],
      ]);
    }
  }
  return state;
};
