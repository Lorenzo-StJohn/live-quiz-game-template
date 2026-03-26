import type { WebSocket } from 'ws';

import {
  type Game,
  MessageTypeError,
  MessageTypeGame,
  MessageTypeUser,
  type Player,
} from '../../types';
import { ColorLog } from '../../utils/ColorLog';
import { sendWs } from '../../utils/sendWs';
import type { Reducer } from '../types';

const HOST_ERROR_MESSAGE = {
  message: "You cant't join your own game",
};

const START_ERROR_MESSAGE = {
  message: "You cant't start a game which is created not by you",
};

const INPROGRESS_ERROR_MESSAGE = {
  message: "You cant't start a game which is already in progress or finished",
};

const JOIN_FINISHED_ERROR_MESSAGE = {
  message: "You cant't join already finished game",
};

const updateBroadcast = (state: Game, client?: WebSocket) => {
  const data = state.players.reduce(
    (accumulator: Partial<Player>[], currentPlayer: Player) => {
      const { name, index, score } = currentPlayer;
      accumulator.push({ name, index, score });
      return accumulator;
    },
    [],
  );
  if (client) {
    sendWs(client, data, MessageTypeGame.UPDATE_PLAYERS);
    return;
  }

  if (state.hostWs) {
    sendWs(state.hostWs, data, MessageTypeGame.UPDATE_PLAYERS);
  }

  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      sendWs(ws, data, MessageTypeGame.UPDATE_PLAYERS);
    });
  });
};

const questionBroadcast = (state: Game, client?: WebSocket) => {
  const dateNow = Date.now();
  const data = {
    questionNumber: state.currentQuestion,
    totalQuestions: state.questions.length,
    text: state.questions[state.currentQuestion].text,
    options: state.questions[state.currentQuestion].options,
    timeLimitSec:
      state.questions[state.currentQuestion].timeLimitSec -
      Math.floor((dateNow - (state.questionStartTime ?? dateNow)) / 1000),
  };

  if (client) {
    sendWs(client, data, MessageTypeGame.QUESTION);
    return;
  }

  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      sendWs(ws, data, MessageTypeGame.QUESTION);
    });
  });

  if (state.hostWs) {
    sendWs(state.hostWs, data, MessageTypeGame.QUESTION);
  }
};

export const gameReducer: Reducer<Game> = (state, action) => {
  switch (action.type) {
    case MessageTypeGame.JOIN_GAME: {
      const { name, index, client } = action.data;

      if (state.hostId === index) {
        sendWs(client, HOST_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error("❌ Hosts can't join their own games");
        return state;
      }

      if (state.status === 'finished') {
        sendWs(client, JOIN_FINISHED_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${JOIN_FINISHED_ERROR_MESSAGE.message}`);
        return state;
      }

      const playerArrayIndex = state.players.findIndex(
        (player) => player.index === index,
      );

      if (playerArrayIndex !== -1) {
        sendWs(
          client,
          { gameId: state.id, code: state.code },
          MessageTypeGame.JOIN_GAME_SUCCESS,
        );
        ColorLog.warn(
          `🔕 Player ${name} has already joined the game with code ${state.code} before`,
        );
        updateBroadcast(state, client);
        if (state.status === 'in_progress') {
          questionBroadcast(state, client);
        }
        state.players[playerArrayIndex].ws = [
          ...state.players[playerArrayIndex].ws,
          client,
        ];
        return { ...state };
      }
      const ws = [client];

      const player: Player = {
        name,
        index,
        score: 0,
        ws,
      };

      sendWs(
        client,
        { gameId: state.id, code: state.code },
        MessageTypeGame.JOIN_GAME_SUCCESS,
      );
      ColorLog.primary(
        `🎮 Player ${name} successfully joined the game with the code ${state.code}`,
      );

      state.players = [...state.players, player];
      state.players.forEach((player) => {
        player.ws.forEach((client) => {
          sendWs(
            client,
            { playerName: name, playerCount: state.players.length },
            MessageTypeGame.PLAYER_JOIN,
          );
        });
      });

      updateBroadcast(state);
      if (state.status === 'in_progress') {
        questionBroadcast(state, client);
      }

      return { ...state };
    }

    case MessageTypeUser.DISCONNECTION: {
      const client = action.data.wsClient;
      if (state.hostWs === client) {
        return { ...state, hostWs: null };
      }

      state.players.forEach((player, index) => {
        const wsIndex = player.ws.findIndex((ws) => ws === client);
        if (wsIndex !== -1) {
          player.ws.splice(wsIndex, 1);
          if (player.ws.length > 0) {
            return;
          }
          state.players.splice(index, 1);
          updateBroadcast(state);
          return;
        }
      });
      return { ...state };
    }

    case MessageTypeGame.START_GAME: {
      const client: WebSocket = action.data.wsClient;
      const index = action.data.index;

      if (index !== state.hostId) {
        sendWs(client, START_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${START_ERROR_MESSAGE.message}`);
        return state;
      }

      if (state.status !== 'waiting') {
        sendWs(client, INPROGRESS_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${INPROGRESS_ERROR_MESSAGE.message}`);
        return state;
      }

      state.hostWs = client;
      state.status = 'in_progress';
      return { ...state };
    }

    case MessageTypeGame.NEXT_QUESTION: {
      state.currentQuestion += 1;
      if (state.currentQuestion === state.questions.length) {
        state.status = 'finished';
        return { ...state };
      }
      state.questionStartTime = Date.now();
      questionBroadcast(state);
      ColorLog.plain(
        `💌 Question ${state.currentQuestion}: ${state.questions[state.currentQuestion].text}`,
      );
      return { ...state };
    }

    default: {
      return state;
    }
  }
};
