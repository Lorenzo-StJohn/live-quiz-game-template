import type { WebSocket } from 'ws';

import { Store } from '../store/Store.js';
import type { Action } from '../store/types.js';
import {
  type Game,
  type Player,
  type Question,
  MessageTypeError,
  MessageTypeGame,
  MessageTypeUser,
} from '../types.js';
import { ColorLog } from '../utils/ColorLog.js';
import { generateCode } from '../utils/generateCode.js';
import { sendWs } from '../utils/sendWs.js';
import {
  gameReducer,
  MILLISECONDS_IN_SECOND,
} from '../store/reducers/gameReducer.js';

class GameService {
  private games: Map<string, Store<Game>>;
  private codeMap: Map<string, string>;
  private wsMap: Map<WebSocket, string>;
  private timers: Map<string, NodeJS.Timeout>;
  private RESULT_SHOW_TIME = 3000;

  constructor() {
    this.games = new Map<string, Store<Game>>();
    this.codeMap = new Map<string, string>();
    this.wsMap = new Map<WebSocket, string>();
    this.timers = new Map<string, NodeJS.Timeout>();
  }

  public createGame(action: Action) {
    const client: WebSocket = action.data.wsClient;
    const hostId = action.data.hostId;

    const hostWs = client;
    const id = `game${this.games.size}`;

    this.wsMap.set(client, id);

    let code = generateCode(6);
    while (this.games.has(code)) {
      code = generateCode(6);
    }

    const questions: Question[] = action.data.questions;
    const players: Player[] = [];
    const oldPlayers: Player[] = [];
    const currentQuestion = -1;
    const status: Game['status'] = 'waiting';
    const playerAnswers: Game['playerAnswers'] = new Map();

    sendWs([client], { gameId: id, code }, MessageTypeGame.CREATE_GAME_SUCCESS);
    ColorLog.primary(
      `🎲 A new game successfully created. Use the invitation code: ${code}`,
    );

    const game = {
      id,
      code,
      hostId,
      hostWs,
      questions,
      players,
      oldPlayers,
      currentQuestion,
      status,
      playerAnswers,
    };

    const gameStore = new Store<Game>(gameReducer, game);
    this.games.set(game.id, gameStore);
    this.codeMap.set(game.code, game.id);

    gameStore.subscribe((state, action) => {
      switch (action.type) {
        case MessageTypeGame.START_GAME: {
          gameStore.dispatch({
            type: MessageTypeGame.NEXT_QUESTION,
            data: {
              players: state.players,
            },
          });
          break;
        }

        case MessageTypeGame.NEXT_QUESTION: {
          if (state.status === 'finished') {
            gameStore.dispatch({
              type: MessageTypeGame.GAME_FINISHED,
              data: {},
            });
            break;
          }
          const timer = setTimeout(() => {
            this.timers.delete(state.id);
            gameStore.dispatch({
              type: MessageTypeGame.QUESTION_RESULT,
              data: {},
            });
          }, state.questions[state.currentQuestion].timeLimitSec * MILLISECONDS_IN_SECOND);
          this.timers.set(state.id, timer);
          break;
        }

        case MessageTypeGame.ANSWER: {
          if (
            state.playerAnswers.size === state.players.length &&
            this.timers.get(state.id)
          ) {
            clearTimeout(this.timers.get(state.id));
            this.timers.delete(state.id);
            gameStore.dispatch({
              type: MessageTypeGame.QUESTION_RESULT,
              data: {},
            });
          }
          break;
        }

        case MessageTypeUser.DISCONNECTION: {
          if (
            state.status === 'in_progress' &&
            state.playerAnswers.size === state.players.length &&
            this.timers.get(state.id)
          ) {
            clearTimeout(this.timers.get(state.id));
            this.timers.delete(state.id);
            gameStore.dispatch({
              type: MessageTypeGame.QUESTION_RESULT,
              data: {},
            });
          }
          break;
        }

        case MessageTypeGame.QUESTION_RESULT: {
          setTimeout(() => {
            gameStore.dispatch({
              type: MessageTypeGame.NEXT_QUESTION,
              data: {
                players: state.players,
              },
            });
          }, this.RESULT_SHOW_TIME);
          break;
        }
      }
    });
  }

  public handleDisconnect(action: Action) {
    const ws = action.data.wsClient;
    const gameId = this.wsMap.get(ws);
    if (!gameId) {
      return;
    }
    this.games.get(gameId)?.dispatch(action);
  }

  public joinGame(action: Action) {
    const client: WebSocket = action.data.wsClient;
    const name: string = action.data.name;
    const index: string = action.data.index;
    const code: string = action.data.code;

    const id = this.codeMap.get(code)!;

    if (!id || !this.games.has(id)) {
      sendWs(
        [client],
        { message: `Game with code ${code} not found` },
        MessageTypeError.ERROR,
      );
      ColorLog.error(`❌ Game with code ${code} not found`);
      return;
    }

    const game = this.games.get(id)!;
    this.wsMap.set(client, id);

    game.dispatch({
      type: MessageTypeGame.JOIN_GAME,
      data: { name, index, client },
    });
  }

  public startGame(action: Action) {
    const client: WebSocket = action.data.wsClient;
    const { gameId } = action.data;

    const game = this.games.get(gameId);
    if (!game) {
      sendWs(
        [client],
        { message: `Game with specified id not found` },
        MessageTypeError.ERROR,
      );
      ColorLog.error(`❌ Game with id ${gameId} not found`);
      return;
    }

    game.dispatch(action);
  }

  public answer(action: Action) {
    const client: WebSocket = action.data.wsClient;
    const { gameId } = action.data;

    const game = this.games.get(gameId);
    if (!game) {
      sendWs(
        [client],
        { message: `Game with specified id not found` },
        MessageTypeError.ERROR,
      );
      ColorLog.error(`❌ Game with id ${gameId} not found`);
      return;
    }

    game.dispatch(action);
  }
}

export const gameService = new GameService();
