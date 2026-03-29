# Assignment: WebSocket Live Quiz Game

## Description

This repository contains solution for [Assignment: WebSocket — Live Quiz Game](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments-v2/04-websockets/assignment.md). It has custom implementation of a server and a pre-written client.

## Requirements

- **Node.js** version: >=24.10.0
- **npm** version: >=10.9.2

## Getting started

### 1. Clone repository

```bash
git clone https://github.com/Lorenzo-StJohn/live-quiz-game-template
```

### 2. Go to the project folder

```bash
cd live-quiz-game-template
```

### 3. Checkout to the development branch

```bash
git checkout development
```

### 4. Install dependencies

```bash
npm ci
```

### 5. Create .env file

```bash
cp .env.example .env
```

> [!WARNING]
> Pre-written by the course's author client works only with `3000` port!

## How to test

1. Start the server: `npm run start:server`
2. Start the client: `npm run start:client`
3. Open `http://localhost:5173` in two browser tabs
4. In one tab — register and create a game (host)
5. In the other tab — register and join the game using the room code
6. Host starts the game, player answers questions
7. Verify scores, results, and final scoreboard
