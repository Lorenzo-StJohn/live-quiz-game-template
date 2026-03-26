import { Game, MessageTypeGame, MessageTypeUser, Player } from '../../types';
import { ColorLog } from '../../utils/ColorLog';
import { sendWs } from '../../utils/sendWs';
import { Reducer } from '../types';

const updateBroadcast = (state: Game) => {
  const data = state.players.reduce(
    (accumulator: Partial<Player>[], currentPlayer: Player) => {
      const { name, index, score } = currentPlayer;
      accumulator.push({ name, index, score });
      return accumulator;
    },
    [],
  );

  state.hostWs.forEach((ws) => {
    sendWs(ws, data, MessageTypeGame.UPDATE_PLAYERS);
  });

  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      sendWs(ws, data, MessageTypeGame.UPDATE_PLAYERS);
    });
  });
};

export const gameReducer: Reducer<Game> = (state, action) => {
  switch (action.type) {
    case MessageTypeGame.JOIN_GAME: {
      const { name, index, ws, client } = action.data;

      const isNewPlayer = state.players.every(
        (player) => player.index !== index,
      );

      if (!isNewPlayer) {
        sendWs(
          client,
          { gameId: state.id, code: state.code },
          MessageTypeGame.CREATE_GAME_SUCCESS,
        );
        ColorLog.warn(
          `🔕 Player ${name} has already joined the game with code ${state.code} before`,
        );
        return state;
      }

      const player: Player = {
        name,
        index,
        score: 0,
        ws,
      };

      sendWs(
        client,
        { gameId: state.id, code: state.code },
        MessageTypeGame.CREATE_GAME_SUCCESS,
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
      state.players.forEach((player) => {
        //to be done
      });
    }
    case MessageTypeUser.REGISTRATION: {
      state.players.forEach((player) => {
        //to be done
      });
    }
  }
  return state;
};
