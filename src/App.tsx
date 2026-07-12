/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, BrainCircuit, Upload } from 'lucide-react';
import {
  createEmptyBoard,
  getRandomPuyo,
  thinkAI,
  dropPuyo,
  resolveChains,
  ROWS,
  COLS,
} from './gameLogic';
import { BoardState, AIWeights } from './types';

const INITIAL_WEIGHTS: AIWeights = {
  w_chain: 10,
  w_connect2: 2,
  w_connect3: 5,
  w_height: 1,
};

export default function App() {
  const [board, setBoard] = useState<BoardState>(createEmptyBoard());
  const [nextPuyo, setNextPuyo] = useState<[number, number]>(getRandomPuyo());
  const [weights, setWeights] = useState<AIWeights>(INITIAL_WEIGHTS);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const [stats, setStats] = useState({
    maxChains: 0,
    drops: 0,
    lastScore: 0,
  });

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setNextPuyo(getRandomPuyo());
    setIsGameOver(false);
    setIsPlaying(false);
    setStats({ maxChains: 0, drops: 0, lastScore: 0 });
  };

  const executeMove = useCallback(() => {
    if (isGameOver) return;

    // Spawn check (usually around col 2, row 0)
    if (board[0][2] !== 0) {
      setIsGameOver(true);
      setIsPlaying(false);
      return;
    }

    const move = thinkAI(board, nextPuyo[0], nextPuyo[1], weights);
    
    if (!move) {
      setIsGameOver(true);
      setIsPlaying(false);
      return; // No valid moves
    }

    const droppedBoard = dropPuyo(board, move.col, move.rot, nextPuyo[0], nextPuyo[1]);
    if (!droppedBoard) {
      setIsGameOver(true);
      setIsPlaying(false);
      return;
    }

    const { newBoard, chains } = resolveChains(droppedBoard);
    
    setBoard(newBoard);
    setNextPuyo(getRandomPuyo());
    
    setStats(prev => ({
      maxChains: Math.max(prev.maxChains, chains),
      drops: prev.drops + 1,
      lastScore: move.maxScore
    }));
  }, [board, nextPuyo, weights, isGameOver]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && !isGameOver) {
      interval = setInterval(executeMove, 200); // 200ms for "high-speed" feeling
    }
    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, executeMove]);

  const getColorClass = (colorId: number) => {
    switch (colorId) {
      case 1: return 'bg-red-500 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.2)]';
      case 2: return 'bg-blue-500 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.2)]';
      case 3: return 'bg-green-500 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.2)]';
      case 4: return 'bg-yellow-400 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.2)]';
      default: return 'bg-gray-800/50';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-6 md:p-12 flex flex-col items-center">
      <header className="mb-8 text-center max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-3 mb-2">
          <BrainCircuit className="w-8 h-8 text-indigo-400" />
          High-Speed Puyo AI Simulator
        </h1>
        <p className="text-slate-400 text-sm">
          2次元配列・幅優先探索(BFS)・24パターンの評価関数を用いた思考シミュレーション
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-12 w-full max-w-5xl justify-center">
        
        {/* Left Column: Game Board */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-between w-full px-2">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Next</div>
            <div className="flex flex-col gap-1 bg-slate-800/80 p-2 rounded-xl ring-1 ring-slate-700">
              <div className={`w-5 h-5 rounded-full ${getColorClass(nextPuyo[1])}`} />
              <div className={`w-5 h-5 rounded-full ${getColorClass(nextPuyo[0])}`} />
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-2xl ring-4 ring-slate-800 shadow-2xl relative">
            {isGameOver && (
              <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center flex-col">
                <span className="text-2xl font-bold text-white mb-2 tracking-widest">GAME OVER</span>
                <button 
                  onClick={resetGame}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  Restart AI
                </button>
              </div>
            )}
            
            <div className="grid grid-rows-[13] grid-cols-[6] gap-1 bg-slate-950 p-2 rounded-xl">
              {board.map((row, rIdx) => (
                <div key={rIdx} className="contents">
                  {row.map((cell, cIdx) => (
                    <div 
                      key={`${rIdx}-${cIdx}`} 
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full transition-all duration-75 ${getColorClass(cell)} ${cell !== 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-20'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Controls & Stats */}
        <div className="flex flex-col gap-6 w-full max-w-sm">
          
          {/* Controls */}
          <div className="bg-slate-800/50 rounded-2xl p-6 ring-1 ring-slate-700/50">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">Execution Controls</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isGameOver}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${isPlaying ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 ring-1 ring-amber-500/50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? 'Pause Auto' : 'Auto Play'}
              </button>
              
              <button 
                onClick={executeMove}
                disabled={isPlaying || isGameOver}
                className="flex-[0.5] flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-5 h-5" />
                Step
              </button>
              
              <button 
                onClick={resetGame}
                className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30 py-3 px-4 rounded-xl transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Reset Board
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-2xl ring-1 ring-slate-700/50 flex flex-col">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Max Chains</span>
              <span className="text-3xl font-bold text-emerald-400 font-mono">{stats.maxChains}</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl ring-1 ring-slate-700/50 flex flex-col">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Puyos Dropped</span>
              <span className="text-3xl font-bold text-sky-400 font-mono">{stats.drops}</span>
            </div>
          </div>

          {/* AI Brain Weights */}
          <div className="bg-slate-800/50 rounded-2xl p-6 ring-1 ring-slate-700/50 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">AI Brain Weights</h2>
              <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-200 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs" title="Upload best_brain.json">
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Load JSON</span>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const json = JSON.parse(event.target?.result as string);
                          if (json && typeof json === 'object') {
                            setWeights({
                              w_chain: Number(json.w_chain) || weights.w_chain,
                              w_connect2: Number(json.w_connect2) || weights.w_connect2,
                              w_connect3: Number(json.w_connect3) || weights.w_connect3,
                              w_height: Number(json.w_height) || weights.w_height,
                            });
                          }
                        } catch (err) {
                          alert('Invalid JSON file');
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>
            
            <div className="space-y-5">
              <WeightSlider 
                label="w_chain" 
                desc="連鎖の爆発的加点" 
                value={weights.w_chain} 
                min={1} max={50} 
                onChange={(v) => setWeights({...weights, w_chain: v})} 
              />
              <WeightSlider 
                label="w_connect3" 
                desc="3つくっついたら加点" 
                value={weights.w_connect3} 
                min={0} max={20} 
                onChange={(v) => setWeights({...weights, w_connect3: v})} 
              />
              <WeightSlider 
                label="w_connect2" 
                desc="2つくっついたら加点" 
                value={weights.w_connect2} 
                min={0} max={10} 
                onChange={(v) => setWeights({...weights, w_connect2: v})} 
              />
              <WeightSlider 
                label="w_height" 
                desc="高さペナルティ (減点)" 
                value={weights.w_height} 
                min={0} max={10} 
                onChange={(v) => setWeights({...weights, w_height: v})} 
                invertColor
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function WeightSlider({ 
  label, 
  desc, 
  value, 
  min, 
  max, 
  onChange, 
  invertColor = false 
}: { 
  label: string, 
  desc: string, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void,
  invertColor?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-end">
        <div>
          <div className="font-mono text-sm font-semibold text-indigo-300">{label}</div>
          <div className="text-[10px] text-slate-500">{desc}</div>
        </div>
        <div className="font-mono text-sm bg-slate-900 px-2 py-0.5 rounded text-slate-300">
          {value}
        </div>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 ${invertColor ? 'accent-rose-500' : 'accent-indigo-500'}`}
      />
    </div>
  );
}

