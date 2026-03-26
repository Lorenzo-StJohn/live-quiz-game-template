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

const HOST_ERROR_MESSAGE = {
  message: "You cant't join your own game",
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
        `🎮 Player ${name} successfully joined the game with code ${state.code}`,
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
  }
  return state;
};
