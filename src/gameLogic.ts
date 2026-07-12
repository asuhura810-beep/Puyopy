import { AIWeights } from './types';

export const ROWS = 13;
export const COLS = 6;
export const COLORS = 4; // 1: Red, 2: Blue, 3: Green, 4: Yellow

export function createEmptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function getRandomPuyo(): [number, number] {
  return [
    Math.floor(Math.random() * COLORS) + 1,
    Math.floor(Math.random() * COLORS) + 1,
  ];
}

export function dropPuyo(
  board: number[][],
  col: number,
  rot: number,
  mainColor: number,
  subColor: number
): number[][] | null {
  let newBoard = board.map((r) => [...r]);
  let cMain = col;
  let cSub = col;

  if (rot === 1) cSub = col + 1; // Sub is to the right
  if (rot === 3) cSub = col - 1; // Sub is to the left

  if (cSub < 0 || cSub >= COLS) return null;

  // rot 0: Sub is above Main (same col)
  // rot 2: Sub is below Main (same col)
  if (rot === 0 || rot === 2) {
    let bottomColor = rot === 0 ? mainColor : subColor;
    let topColor = rot === 0 ? subColor : mainColor;

    let r = ROWS - 1;
    while (r >= 0 && newBoard[r][cMain] !== 0) r--;
    if (r < 1) return null; // Not enough space

    newBoard[r][cMain] = bottomColor;
    newBoard[r - 1][cMain] = topColor;
  } else {
    // Different columns
    let rMain = ROWS - 1;
    while (rMain >= 0 && newBoard[rMain][cMain] !== 0) rMain--;
    let rSub = ROWS - 1;
    while (rSub >= 0 && newBoard[rSub][cSub] !== 0) rSub--;

    if (rMain < 0 || rSub < 0) return null;

    newBoard[rMain][cMain] = mainColor;
    newBoard[rSub][cSub] = subColor;
  }

  return newBoard;
}

export function resolveChains(board: number[][]): { newBoard: number[][]; chains: number } {
  let currentBoard = board.map((r) => [...r]);
  let chains = 0;

  while (true) {
    let matched = false;
    let toRemove = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    // 1. Find >= 4 connections using BFS
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (currentBoard[r][c] !== 0 && !visited[r][c]) {
          let color = currentBoard[r][c];
          let queue = [[r, c]];
          let group = [[r, c]];
          visited[r][c] = true;

          let head = 0;
          while (head < queue.length) {
            let [qr, qc] = queue[head++];
            const dirs = [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ];
            for (let [dr, dc] of dirs) {
              let nr = qr + dr;
              let nc = qc + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (currentBoard[nr][nc] === color && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                  group.push([nr, nc]);
                }
              }
            }
          }

          if (group.length >= 4) {
            matched = true;
            for (let [gr, gc] of group) {
              toRemove[gr][gc] = true;
            }
          }
        }
      }
    }

    if (!matched) break;
    chains++;

    // 2. Remove and apply gravity
    for (let c = 0; c < COLS; c++) {
      let writeR = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!toRemove[r][c] && currentBoard[r][c] !== 0) {
          let val = currentBoard[r][c];
          currentBoard[r][c] = 0;
          currentBoard[writeR][c] = val;
          writeR--;
        } else if (toRemove[r][c]) {
          currentBoard[r][c] = 0;
        }
      }
    }
  }

  return { newBoard: currentBoard, chains };
}

export function evaluateBoard(board: number[][], chains: number, weights: AIWeights): number {
  let score = 0;

  if (chains > 0) {
    // Exponential reward for chains
    score += Math.pow(10, chains) * weights.w_chain;
  }

  let connect2 = 0;
  let connect3 = 0;
  let maxHeight = 0;

  let visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  // Find max height
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== 0) {
        maxHeight = Math.max(maxHeight, ROWS - r);
        break;
      }
    }
  }

  // Count 2-connects and 3-connects using BFS
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0 && !visited[r][c]) {
        let color = board[r][c];
        let count = 0;
        let queue = [[r, c]];
        visited[r][c] = true;

        let head = 0;
        while (head < queue.length) {
          let [qr, qc] = queue[head++];
          count++;
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (let [dr, dc] of dirs) {
            let nr = qr + dr;
            let nc = qc + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              if (board[nr][nc] === color && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }
        }
        if (count === 2) connect2++;
        if (count === 3) connect3++;
      }
    }
  }

  score += connect2 * weights.w_connect2;
  score += connect3 * weights.w_connect3;
  score -= maxHeight * weights.w_height;

  return score;
}

export function thinkAI(
  board: number[][],
  mainColor: number,
  subColor: number,
  weights: AIWeights
): { col: number; rot: number; maxScore: number } | null {
  let bestScore = -Infinity;
  let bestMove = null;

  // Exhaustive Search: 6 columns * 4 rotations = 24 patterns
  for (let col = 0; col < COLS; col++) {
    for (let rot = 0; rot < 4; rot++) {
      let dropped = dropPuyo(board, col, rot, mainColor, subColor);
      if (dropped) {
        let { newBoard, chains } = resolveChains(dropped);
        let score = evaluateBoard(newBoard, chains, weights);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { col, rot, maxScore: score };
        }
      }
    }
  }

  return bestMove;
}
