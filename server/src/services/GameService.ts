import type { WebSocket } from 'ws';

import { Store } from '../store/Store';
import type { Action, Listener, UserState } from '../store/types';
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
import { userStore } from '../store/userStore';
import { gameReducer } from '../store/reducers/gameReducer';

class GameService {
  private games: Map<string, Store<Game>>;
  private codeMap: Map<string, string>;
  private userState: UserState;

  private readonly USER_ERROR_MESSAGE = {
    message: 'Unknown user',
  } as const;

  constructor() {
    this.games = new Map<string, Store<Game>>();
    this.codeMap = new Map<string, string>();
    this.userState = userStore.getState();
    userStore.subscribe(this.handleUserEvent);
  }

  public createGame(action: Action) {
    const client: WebSocket = action.data.wsClient;
    const hostName = this.userState.socketMap.get(client);

    if (!hostName) {
      return sendWs(client, this.USER_ERROR_MESSAGE, MessageTypeError.ERROR);
    }

    const hostId = this.userState.nameMap.get(hostName)!.index;
    const hostWs = this.userState.nameMap.get(hostName)!.ws;
    const id = `game${this.games.size}`;

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

  handleUserEvent: Listener<UserState> = (state, action) => {
    this.userState = state;
    this.games.forEach((game) =>
      game.dispatch({
        type: action.type,
        data: state,
      }),
    );
  };

  joinGame(action: Action) {
    const client: WebSocket = action.data.wsClient;
    const name = this.userState.socketMap.get(client);
    if (!name) {
      return sendWs(client, this.USER_ERROR_MESSAGE, MessageTypeError.ERROR);
    }
    const index = this.userState.nameMap.get(name)!.index;
    const ws = this.userState.nameMap.get(name)!.ws;
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

    game.dispatch({
      type: MessageTypeGame.JOIN_GAME,
      data: { name, index, ws, client },
    });
  }
}

export const gameService = new GameService();
