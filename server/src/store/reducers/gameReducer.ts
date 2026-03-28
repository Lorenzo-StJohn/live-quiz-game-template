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

const BASE_POINTS = 1000;

export const MILLISECONDS_IN_SECOND = 1000;

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

const NOT_JOIN_ERROR_MESSAGE = {
  message: "You cant't answer because you haven't joined this game",
};

const NOT_CURRENT_QUESTION_ERROR_MESSAGE = {
  message: "You're trying to answer to not current question",
};

const ALREADY_ANSWER_ERROR_MESSAGE = {
  message: "You've already answered to this question",
};

const LATE_ANSWER_ERROR_MESSAGE = {
  message: 'Time for answering to this question has expired',
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
    sendWs([client], data, MessageTypeGame.UPDATE_PLAYERS);
    return;
  }

  const clients: WebSocket[] = [];
  if (state.hostWs) {
    clients.push(state.hostWs);
  }

  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      clients.push(ws);
    });
  });

  sendWs(clients, data, MessageTypeGame.UPDATE_PLAYERS);
};

const questionBroadcast = (state: Game, client?: WebSocket) => {
  const dateNow = Date.now();
  // +1 because pre-written client for some reason sends back questionIndex - 1, not questionIndex
  const data = {
    questionNumber: state.currentQuestion + 1,
    totalQuestions: state.questions.length,
    text: state.questions[state.currentQuestion].text,
    options: state.questions[state.currentQuestion].options,
    timeLimitSec:
      state.questions[state.currentQuestion].timeLimitSec -
      Math.floor((dateNow - (state.questionStartTime ?? dateNow)) / 1000),
  };

  if (client) {
    sendWs([client], data, MessageTypeGame.QUESTION);
    return;
  }

  const clients: WebSocket[] = [];
  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      clients.push(ws);
    });
  });

  if (state.hostWs) {
    clients.push(state.hostWs);
  }

  sendWs(clients, data, MessageTypeGame.QUESTION);
};

const calculateScore = (
  timestamp: number,
  questionStartTime: number,
  timeLimitSec: number,
) => {
  const questionScore = Math.max(
    0,
    (BASE_POINTS *
      (timeLimitSec * MILLISECONDS_IN_SECOND -
        (timestamp - questionStartTime))) /
      (timeLimitSec * MILLISECONDS_IN_SECOND),
  );
  return Number(questionScore.toFixed(0));
};

const resultBroadcast = (state: Game) => {
  const earned = state.players.map((player) => {
    return player.hasAnswered && player.answeredCorrectly
      ? calculateScore(
          state.playerAnswers.get(player.index)!.timestamp,
          state.questionStartTime!,
          state.questions[state.currentQuestion].timeLimitSec,
        )
      : 0;
  });

  state.players.forEach((player, index) => {
    player.score += earned[index];
  });

  const playerResults = state.players.map((player, index) => {
    return {
      name: player.name,
      answered: player.hasAnswered,
      correct: player.hasAnswered && player.answeredCorrectly,
      pointsEarned: earned[index],
      totalScore: player.score,
    };
  });

  const data = {
    questionIndex: state.currentQuestion,
    correctIndex: state.questions[state.currentQuestion].correctIndex,
    playerResults,
  };

  const clients: WebSocket[] = [];
  if (state.hostWs) {
    clients.push(state.hostWs);
  }

  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      clients.push(ws);
    });
  });

  sendWs(clients, data, MessageTypeGame.QUESTION_RESULT);
};

const finishResultBroadcast = (state: Game) => {
  const sortedPlayers = state.players.sort((a, b) => b.score - a.score);
  const scoreboard = sortedPlayers.map((player, index) => {
    return {
      name: player.name,
      score: player.score,
      rank: index + 1,
    };
  });
  const data = { scoreboard };

  const clients: WebSocket[] = [];
  if (state.hostWs) {
    clients.push(state.hostWs);
  }

  state.players.forEach((player) => {
    player.ws.forEach((ws) => {
      clients.push(ws);
    });
  });

  sendWs(clients, data, MessageTypeGame.GAME_FINISHED);
};

export const gameReducer: Reducer<Game> = (state, action) => {
  switch (action.type) {
    case MessageTypeGame.JOIN_GAME: {
      const { name, index, client } = action.data;

      if (state.hostId === index) {
        sendWs([client], HOST_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error("❌ Hosts can't join their own games");
        return state;
      }

      if (state.status === 'finished') {
        sendWs([client], JOIN_FINISHED_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${JOIN_FINISHED_ERROR_MESSAGE.message}`);
        return state;
      }

      const playerArrayIndex = state.players.findIndex(
        (player) => player.index === index,
      );

      if (playerArrayIndex !== -1) {
        sendWs(
          [client],
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
        if (!state.players[playerArrayIndex].ws.includes(client)) {
          state.players[playerArrayIndex].ws = [
            ...state.players[playerArrayIndex].ws,
            client,
          ];
        }
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
        [client],
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
            [client],
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
          state.playerAnswers.delete(player.index);
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
        sendWs([client], START_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${START_ERROR_MESSAGE.message}`);
        return state;
      }

      if (state.status !== 'waiting') {
        sendWs([client], INPROGRESS_ERROR_MESSAGE, MessageTypeError.ERROR);
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
      state.playerAnswers.clear();
      questionBroadcast(state);
      state.players.forEach((player) => {
        player.hasAnswered = false;
      });
      ColorLog.plain(
        `💌 Question ${state.currentQuestion}: ${state.questions[state.currentQuestion].text}`,
      );
      return { ...state };
    }

    case MessageTypeGame.ANSWER: {
      const client = action.data.wsClient;
      const { index, questionIndex, answerIndex, timestamp } = action.data;
      const currentPlayer = state.players.find(
        (player) => player.index === index,
      );

      if (!currentPlayer) {
        sendWs([client], NOT_JOIN_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${NOT_JOIN_ERROR_MESSAGE.message}`);
        return state;
      }

      if (state.currentQuestion !== questionIndex) {
        sendWs(
          [client],
          NOT_CURRENT_QUESTION_ERROR_MESSAGE,
          MessageTypeError.ERROR,
        );
        ColorLog.error(`❌ ${NOT_CURRENT_QUESTION_ERROR_MESSAGE.message}`);
        return state;
      }

      if (state.playerAnswers.has(index)) {
        sendWs([client], ALREADY_ANSWER_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${ALREADY_ANSWER_ERROR_MESSAGE.message}`);
        return state;
      }

      if (
        state.questionStartTime! +
          state.questions[state.currentQuestion].timeLimitSec *
            MILLISECONDS_IN_SECOND <
        timestamp
      ) {
        sendWs([client], LATE_ANSWER_ERROR_MESSAGE, MessageTypeError.ERROR);
        ColorLog.error(`❌ ${LATE_ANSWER_ERROR_MESSAGE.message}`);
        return state;
      }

      state.playerAnswers.set(index, { answerIndex, timestamp });

      currentPlayer.hasAnswered = true;
      currentPlayer.answeredCorrectly =
        state.questions[state.currentQuestion].correctIndex === answerIndex;

      sendWs([client], { questionIndex }, MessageTypeGame.ANSWER_ACCEPTED);
      ColorLog.success(`🍿 Accepted answer from ${currentPlayer.name}`);
      return { ...state };
    }

    case MessageTypeGame.QUESTION_RESULT: {
      resultBroadcast(state);
      ColorLog.tertiary(
        `🎯 Time to see results for ${state.currentQuestion} question`,
      );
      return { ...state };
    }

    case MessageTypeGame.GAME_FINISHED: {
      finishResultBroadcast(state);
      ColorLog.primary('🏆 Time to see the final results');
      return state;
    }

    default: {
      return state;
    }
  }
};
