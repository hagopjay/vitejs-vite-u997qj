import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Initialize Stockfish Web Workers
    const newWorkers = games.map(
      () => new Worker(new URL('./stockfish-worker.js', import.meta.url))
    );
    setWorkers(newWorkers);

    return () => newWorkers.forEach((worker) => worker.terminate());
  }, []);

  const makeMove = (gameIndex) => {
    const game = games[gameIndex];
    const worker = workers[gameIndex];

    worker.postMessage('position fen ' + game.fen());
    worker.postMessage('go depth 10');

    worker.onmessage = (e) => {
      const match = e.data.match(/bestmove\s+(\S+)/);
      if (match) {
        const move = match[1];
        game.move(move);
        setGames([...games]);
      }
    };
  };

  const onDrop = (sourceSquare, targetSquare, gameIndex) => {
    const game = games[gameIndex];
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    if (move === null) return false;
    setGames([...games]);

    setTimeout(() => makeMove(gameIndex), 250);
    return true;
  };

  const getCustomSquareStyles = (index) => {
    const baseHue = (index * 14) % 360;
    return {
      backgroundColor: `hsl(${baseHue}, 70%, ${index % 2 === 0 ? 85 : 25}%)`,
    };
  };

  return (
    <div className="app">
      <h1>25 Chess Games vs Stockfish</h1>
      <div className="chess-grid">
        {games.map((game, index) => (
          <div key={index} className="chess-container">
            <Chessboard
              position={game.fen()}
              onPieceDrop={(source, target) => onDrop(source, target, index)}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
              }}
              customDarkSquareStyle={getCustomSquareStyles(index)}
              customLightSquareStyle={getCustomSquareStyles(index + 1)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
