'use client';

import { useEffect, useState, useCallback } from 'react';

type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: 'rect' | 'circle' | 'triangle';
  velocityX: number;
  velocityY: number;
};

const CELEBRATION_COLORS = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f97316', // orange
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#a855f7', // purple
];

let pieceId = 0;

export function CelebrationOverlay() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const triggerCelebration = useCallback((msg?: string) => {
    const newPieces: ConfettiPiece[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      const shape = (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)];
      newPieces.push({
        id: pieceId++,
        x: 50 + (Math.random() - 0.5) * 30,
        y: 15 + Math.random() * 10,
        rotation: Math.random() * 360,
        color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        size: 6 + Math.random() * 10,
        delay: Math.random() * 0.3,
        duration: 2 + Math.random() * 2,
        shape,
        velocityX: (Math.random() - 0.5) * 60,
        velocityY: 40 + Math.random() * 50,
      });
    }

    setPieces(newPieces);
    setMessage(msg || 'Celebration!');
    setVisible(true);

    setTimeout(() => {
      setVisible(false);
      setPieces([]);
    }, 4500);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      triggerCelebration(customEvent.detail?.message);
    };
    window.addEventListener('celebration', handler as EventListener);
    return () => window.removeEventListener('celebration', handler as EventListener);
  }, [triggerCelebration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Animated gradient backdrop */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #10b981)',
          backgroundSize: '400% 400%',
          animation: 'celebrationGradient 3s ease infinite',
        }}
      />

      {/* Confetti pieces */}
      {pieces.map((piece) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${piece.x}%`,
          top: `${piece.y}%`,
          width: piece.shape === 'rect' ? `${piece.size}px` : `${piece.size}px`,
          height: piece.shape === 'rect' ? `${piece.size * 0.6}px` : `${piece.size}px`,
          backgroundColor: piece.shape !== 'triangle' ? piece.color : 'transparent',
          borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'rect' ? '2px' : '0',
          borderLeft: piece.shape === 'triangle' ? `${piece.size / 2}px solid transparent` : undefined,
          borderRight: piece.shape === 'triangle' ? `${piece.size / 2}px solid transparent` : undefined,
          borderBottom: piece.shape === 'triangle' ? `${piece.size}px solid ${piece.color}` : undefined,
          transform: `rotate(${piece.rotation}deg)`,
          animation: `confettiFall ${piece.duration}s ease-in ${piece.delay}s forwards`,
          '--velocity-x': `${piece.velocityX}vw`,
          '--velocity-y': `${piece.velocityY}vh`,
        } as React.CSSProperties;

        return <div key={piece.id} style={style} />;
      })}

      {/* Celebration message banner */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 text-center"
        style={{ animation: 'celebrationMessage 4s ease forwards' }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-2xl border-2 border-amber-300">
          <p className="text-2xl font-bold bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            {message}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes celebrationGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes confettiFall {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--velocity-x), var(--velocity-y)) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        @keyframes celebrationMessage {
          0% { transform: translateX(-50%) translateY(-30px) scale(0.5); opacity: 0; }
          15% { transform: translateX(-50%) translateY(0) scale(1.1); opacity: 1; }
          25% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          85% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-20px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
