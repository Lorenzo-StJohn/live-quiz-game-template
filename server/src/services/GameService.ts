import type { WebSocket } from 'ws';

import { Store } from '../store/Store';
import type { Action } from '../store/types';
import {
  type Game,
  type Player,
  type Question,
  MessageTypeError,
  MessageTypeGame,
} from '../types';
import { ColorLog } from '../utils/ColorLog';
import { generateCode } from '../utils/generateCode';
import { sendWs } from '../utils/sendWs';
import { gameReducer } from '../store/reducers/gameReducer';

class GameService {
  private games: Map<string, Store<Game>>;
  private codeMap: Map<string, string>;
  private wsMap: Map<WebSocket, string>;

  constructor() {
    this.games = new Map<string, Store<Game>>();
    this.codeMap = new Map<string, string>();
    this.wsMap = new Map<WebSocket, string>();
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
    const currentQuestion = 0;
    const status: Game['status'] = 'waiting';
    const playerAnswers: Game['playerAnswers'] = new Map();

    sendWs(client, { gameId: id, code }, MessageTypeGame.CREATE_GAME_SUCCESS);
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
      currentQuestion,
      status,
      playerAnswers,
    };

    const gameStore = new Store<Game>(gameReducer, game);
    this.games.set(game.id, gameStore);
    this.codeMap.set(game.code, game.id);
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
        client,
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
}

export const gameService = new GameService();
