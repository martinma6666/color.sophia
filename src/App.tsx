/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, RotateCcw, Play, Info, ChevronRight, Eye } from 'lucide-react';

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

interface Color {
  h: number;
  s: number;
  l: number;
}

// --- Constants ---
const INITIAL_TIME = 15;
const TIME_BONUS = 2;
const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 8;

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [gridSize, setGridSize] = useState(MIN_GRID_SIZE);
  const [colors, setColors] = useState<string[]>([]);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [bestScore, setBestScore] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Helper Functions ---
  const generateColor = useCallback((currentScore: number) => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 40) + 40; // 40-80%
    const l = Math.floor(Math.random() * 40) + 30; // 30-70%

    // Difficulty scaling: delta decreases as score increases
    // Starts at ~15% difference, goes down to ~1%
    const delta = Math.max(1, 15 - Math.floor(currentScore / 3));
    
    // Randomly decide which component to change
    const component = Math.random() > 0.5 ? 'l' : 's';
    const diffL = component === 'l' ? (l > 50 ? -delta : delta) : 0;
    const diffS = component === 's' ? (s > 50 ? -delta : delta) : 0;

    const baseColor = `hsl(${h}, ${s}%, ${l}%)`;
    const targetColor = `hsl(${h}, ${s + diffS}%, ${l + diffL}%)`;

    return { baseColor, targetColor };
  }, []);

  const nextLevel = useCallback((currentScore: number) => {
    // Grid size progression
    let newGridSize = MIN_GRID_SIZE;
    if (currentScore >= 2) newGridSize = 3;
    if (currentScore >= 6) newGridSize = 4;
    if (currentScore >= 12) newGridSize = 5;
    if (currentScore >= 20) newGridSize = 6;
    if (currentScore >= 30) newGridSize = 7;
    if (currentScore >= 45) newGridSize = 8;
    
    setGridSize(newGridSize);
    const { baseColor, targetColor } = generateColor(currentScore);
    const totalBlocks = newGridSize * newGridSize;
    const newTargetIndex = Math.floor(Math.random() * totalBlocks);
    
    const newColors = Array(totalBlocks).fill(baseColor);
    newColors[newTargetIndex] = targetColor;
    
    setColors(newColors);
    setTargetIndex(newTargetIndex);
  }, [generateColor]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setGameState('PLAYING');
    nextLevel(0);
  };

  const handleBlockClick = (index: number) => {
    if (gameState !== 'PLAYING') return;

    if (index === targetIndex) {
      const newScore = score + 1;
      setScore(newScore);
      setTimeLeft(prev => Math.min(prev + TIME_BONUS, 30)); // Cap at 30s
      nextLevel(newScore);
    } else {
      // Penalty for wrong click
      setTimeLeft(prev => Math.max(0, prev - 3));
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('GAMEOVER');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'GAMEOVER' && score > bestScore) {
      setBestScore(score);
    }
  }, [gameState, score, bestScore]);

  // --- Render Helpers ---
  const getRank = (s: number) => {
    if (s < 10) return { title: '色彩初学者', color: 'text-slate-400' };
    if (s < 20) return { title: '色感进阶者', color: 'text-emerald-500' };
    if (s < 35) return { title: '视觉艺术家', color: 'text-indigo-500' };
    if (s < 50) return { title: '色彩大师', color: 'text-amber-500' };
    return { title: '神之眼', color: 'text-rose-500' };
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100 p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Header Stats */}
      <div className="w-full max-w-md mb-8 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Score</p>
            <p className="text-xl font-bold tabular-nums leading-none">{score}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${timeLeft <= 5 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
            <Timer size={20} />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Time</p>
            <p className={`text-xl font-bold tabular-nums leading-none ${timeLeft <= 5 ? 'text-rose-600' : ''}`}>{timeLeft}s</p>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <main className="relative w-full max-w-md aspect-square bg-white p-3 rounded-3xl shadow-xl border border-black/5 overflow-hidden">
        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-white/80 backdrop-blur-sm"
            >
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
                <Eye size={40} />
              </div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">色彩敏感度挑战</h1>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                在相似的色块中找出那个“不合群”的家伙。<br/>
                随着得分提高，色差会越来越小。
              </p>
              <button
                onClick={startGame}
                className="group flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:bg-indigo-600 hover:scale-105 active:scale-95"
              >
                开始挑战 <Play size={18} fill="currentColor" />
              </button>
              
              <button 
                onClick={() => setShowInfo(true)}
                className="mt-4 text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Info size={14} /> 游戏说明
              </button>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-white/90 backdrop-blur-md"
            >
              <p className="text-slate-400 font-semibold uppercase tracking-[0.2em] text-xs mb-2">Game Over</p>
              <h2 className="text-5xl font-black mb-1">{score}</h2>
              <p className={`text-lg font-bold mb-6 ${getRank(score).color}`}>
                {getRank(score).title}
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Best</p>
                  <p className="text-xl font-bold">{bestScore}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Rank</p>
                  <p className="text-sm font-bold truncate">#{Math.floor(score/5) + 1}</p>
                </div>
              </div>

              <button
                onClick={startGame}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-100"
              >
                再试一次 <RotateCcw size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Grid */}
        <div 
          className="grid gap-2 w-full h-full"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`
          }}
        >
          {colors.map((color, idx) => (
            <motion.button
              key={`${idx}-${color}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBlockClick(idx)}
              className="w-full h-full rounded-xl shadow-sm transition-transform hover:z-10 hover:shadow-md"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </main>

      {/* Footer Info */}
      <div className="mt-8 w-full max-w-md">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium px-2">
          <p>© 2024 Color Sensitivity Lab</p>
          <div className="flex gap-4">
            <span>Grid: {gridSize}x{gridSize}</span>
            <span>Diff: {Math.max(1, 15 - Math.floor(score / 3))}%</span>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Info className="text-indigo-600" /> 游戏规则
              </h3>
              
              <div className="space-y-6">
                <section className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
                    <ChevronRight size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">寻找差异</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">在所有色块中，有一个色块的饱和度或明度略有不同。点击它进入下一关。</p>
                  </div>
                </section>

                <section className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-amber-600">
                    <Timer size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">时间管理</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">初始 15 秒。答对加 2 秒，答错扣 3 秒。时间耗尽则游戏结束。</p>
                  </div>
                </section>

                <section className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">难度递增</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">随着得分增加，网格会从 2x2 扩展到 8x8，色差也会逐渐缩小到肉眼难辨。</p>
                  </div>
                </section>
              </div>

              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                明白了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-50/50 blur-[100px]" />
      </div>
    </div>
  );
}
