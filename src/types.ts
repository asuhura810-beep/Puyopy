export type BoardState = number[][];

export interface AIWeights {
  w_chain: number;
  w_connect2: number;
  w_connect3: number;
  w_height: number;
}
