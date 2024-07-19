importScripts(
  'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
);

const stockfish = new Worker(stockfish);

stockfish.onmessage = function (event) {
  postMessage(event.data);
};

onmessage = function (event) {
  stockfish.postMessage(event.data);
};
