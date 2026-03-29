import {
  type WSMessage,
  type RegData,
  type Question,
  MessageTypeUser,
  MessageTypeGame,
} from '../types.js';

const isWSMessage = (msg: unknown): msg is WSMessage => {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof msg.type === 'string' &&
    'id' in msg &&
    typeof msg.id === 'number' &&
    'data' in msg
  );
};

const isRegData = (data: unknown): data is RegData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof data.name === 'string' &&
    'password' in data &&
    typeof data.password === 'string'
  );
};

const isQuestion = (data: unknown, optionNumber: number): data is Question => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  if (!('text' in data) || typeof data.text !== 'string') {
    return false;
  }
  if (
    !('options' in data) ||
    !Array.isArray(data.options) ||
    data.options.length !== optionNumber
  ) {
    return false;
  }
  for (const option in data.options) {
    if (typeof option !== 'string') {
      return false;
    }
  }

  return (
    'correctIndex' in data &&
    typeof data.correctIndex === 'number' &&
    data.correctIndex >= 0 &&
    data.correctIndex < optionNumber &&
    'timeLimitSec' in data &&
    typeof data.timeLimitSec === 'number' &&
    data.timeLimitSec > 0
  );
};

export const commonParse = (msg: any) => {
  const message = msg.toString();
  if (typeof message !== 'string') {
    return null;
  }
  try {
    const msg: unknown = JSON.parse(message.toString());
    if (!isWSMessage(msg)) {
      return null;
    }
    switch (msg.type) {
      case MessageTypeUser.REGISTRATION: {
        return registrationLoginParse(msg);
      }
      case MessageTypeGame.CREATE_GAME: {
        return gameCreationParse(msg);
      }
      case MessageTypeGame.JOIN_GAME: {
        return gameJoiningParse(msg);
      }
      case MessageTypeGame.START_GAME: {
        return gameStartingParse(msg);
      }
      case MessageTypeGame.ANSWER: {
        return answerParse(msg);
      }
      default: {
        return null;
      }
    }
  } catch (err) {
    return null;
  }
};

const registrationLoginParse = (message: WSMessage): WSMessage | null => {
  return isRegData(message.data) ? message : null;
};

const gameCreationParse = (message: WSMessage): WSMessage | null => {
  return 'questions' in message.data &&
    Array.isArray(message.data.questions) &&
    message.data.questions.length > 0 &&
    message.data.questions.reduce(
      (accumulator: boolean, currentQuestion: unknown) =>
        isQuestion(currentQuestion, 4) && accumulator,
      true,
    )
    ? message
    : null;
};

const gameJoiningParse = (message: WSMessage): WSMessage | null => {
  return 'code' in message.data &&
    typeof message.data.code === 'string' &&
    message.data.code.length === 6
    ? message
    : null;
};

const gameStartingParse = (message: WSMessage): WSMessage | null => {
  return 'gameId' in message.data && typeof message.data.gameId === 'string'
    ? message
    : null;
};

const answerParse = (message: WSMessage): WSMessage | null => {
  return 'gameId' in message.data &&
    typeof message.data.gameId === 'string' &&
    'questionIndex' in message.data &&
    typeof message.data.questionIndex === 'number' &&
    'answerIndex' in message.data &&
    typeof message.data.answerIndex === 'number'
    ? message
    : null;
};
