import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './App.css';

const BOARD_COUNT = 25;

function App() {
  const [games, setGames] = useState(
    Array(BOARD_COUNT)
      .fill()
      .map(() => new Chess())
  );
  const [workers, setWorkers] = useState([]);
  const [analysis, setAnalysis] = useState(
    Array(BOARD_COUNT).fill({ evaluation: null, bestMove: null })
  );

  const makeMove = useCallback(
    (gameIndex) => {
      const game = games[gameIndex];
      const worker = workers[gameIndex];
      if (!worker) return;

      worker.postMessage('position fen ' + game.fen());
      worker.postMessage('go depth 15');
      worker.onmessage = (e) => {
        const data = e.data;

        // Update analysis
        if (data.startsWith('info') && data.includes('score cp')) {
          const scoreMatch = data.match(/score cp (-?\d+)/);
          const moveMatch = data.match(/pv (\S+)/);
          if (scoreMatch && moveMatch) {
            const evaluation = parseInt(scoreMatch[1]) / 100;
            const bestMove = moveMatch[1];
            setAnalysis((prev) => {
              const newAnalysis = [...prev];
              newAnalysis[gameIndex] = { evaluation, bestMove };
              return newAnalysis;
            });
          }
        }

        // Make move
        const match = data.match(/bestmove\s+(\S+)/);
        if (match) {
          const move = match[1];
          game.move(move);
          setGames((prevGames) => {
            const newGames = [...prevGames];
            newGames[gameIndex] = new Chess(game.fen());
            return newGames;
          });
          // If the game is not over, schedule the next move
          if (!game.game_over()) {
            setTimeout(() => makeMove(gameIndex), 250);
          }
        }
      };
    },
    [games, workers]
  );

  // ... (rest of the useEffects remain the same)

  useEffect(() => {
    // Initialize Stockfish Web Workers
    const newWorkers = games.map(
      () => new Worker(new URL('./stockfish-worker.js', import.meta.url))
    );
    setWorkers(newWorkers);
    return () => newWorkers.forEach((worker) => worker.terminate());
  }, []);

  useEffect(() => {
    if (workers.length === 0) return;
    // Start the games with Stockfish playing both sides
    games.forEach((_, index) => {
      makeMove(index);
    });
  }, [workers, makeMove]);

  const getCustomSquareStyles = (index) => {
    const baseHue = (index * 14) % 360;
    return {
      backgroundColor: `hsl(${baseHue}, 70%, ${index % 2 === 0 ? 85 : 25}%)`,
    };
  };

  return (
    <div className="app">
      <h1>25 Chess Games: Stockfish vs Stockfish</h1>
      <div className="chess-grid">
        {games.map((game, index) => (
          <div key={index} className="chess-container">
            <Chessboard
              position={game.fen()}
              boardWidth={300}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
              }}
              customDarkSquareStyle={getCustomSquareStyles(index)}
              customLightSquareStyle={getCustomSquareStyles(index + 1)}
            />
            <div className="analysis">
              <p>
                Evaluation:{' '}
                {analysis[index].evaluation !== null
                  ? analysis[index].evaluation.toFixed(2)
                  : 'N/A'}
              </p>
              <p>Best Move: {analysis[index].bestMove || 'N/A'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
