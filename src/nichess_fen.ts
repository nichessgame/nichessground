import * as cg from './types.js';

function squareIndexToCoordinates(squareIndex: number): [number, number] {
  const x = squareIndex -  (Math.floor(squareIndex / 8) * 8);
  const y = Math.floor(squareIndex / 8);
  return [x+1, y+1] // +1 because coordinates shouldn't be 0 indexed here
}


function squareIndexToKey(squareIndex: number): cg.Key {
  const xy = squareIndexToCoordinates(squareIndex)
  const x = xy[0]
  const y = xy[1]
  let file = ""
  switch (x) {
    case 1:
      file = 'a'
      break;
    case 2:
      file = 'b'
      break;
    case 3:
      file = 'c'
      break;
    case 4:
      file = 'd'
      break;
    case 5:
      file = 'e'
      break;
    case 6:
      file = 'f'
      break;
    case 7:
      file = 'g'
      break;
    case 8:
      file = 'h'
      break;
  }
  return (file + y.toString()) as cg.Key
}

export function read(encodedBoard: string): cg.Pieces {
  const pieces: cg.Pieces = new Map();
  const b1: string = encodedBoard.substring(2);
  const ar1: string[] = b1.split(",")
  ar1.pop() // last element is an empty string
  let boardIdx = 0;
  ar1.forEach(item => {
    const ar2 = item.split("-")
    if(ar2[0] !== "empty") {
      const healthPoints = Number(ar2[2])
      const pieceType: string = ar2[0] + ar2[1]
      const key: cg.Key = squareIndexToKey(boardIdx)
      if(pieceType === "0king") {
        pieces.set(key, {
          role: "king",
          color: "white",
          healthPoints: healthPoints
        })
      } else if(pieceType === "0pawn") {
        pieces.set(key, {
          role: "pawn",
          color: "white",
          healthPoints: healthPoints
        })
      } else if(pieceType === "0mage") {
        pieces.set(key, {
          role: "queen",
          color: "white",
          healthPoints: healthPoints
        })
      } else if(pieceType === "0assassin") {
        pieces.set(key, {
          role: "bishop",
          color: "white",
          healthPoints: healthPoints
        })
      } else if(pieceType === "0knight") {
        pieces.set(key, {
          role: "knight",
          color: "white",
          healthPoints: healthPoints
        })
      } else if(pieceType === "0warrior") {
        pieces.set(key, {
          role: "rook",
          color: "white",
          healthPoints: healthPoints
        })
      } else if(pieceType === "1king") {
        pieces.set(key, {
          role: "king",
          color: "black",
          healthPoints: healthPoints
        })
      } else if(pieceType === "1pawn") {
        pieces.set(key, {
          role: "pawn",
          color: "black",
          healthPoints: healthPoints
        })
      } else if(pieceType === "1mage") {
        pieces.set(key, {
          role: "queen",
          color: "black",
          healthPoints: healthPoints
        })
      } else if(pieceType === "1assassin") {
        pieces.set(key, {
          role: "bishop",
          color: "black",
          healthPoints: healthPoints
        })
      } else if(pieceType === "1knight") {
        pieces.set(key, {
          role: "knight",
          color: "black",
          healthPoints: healthPoints
        })
      } else if(pieceType === "1warrior") {
        pieces.set(key, {
          role: "rook",
          color: "black",
          healthPoints: healthPoints
        })
      }
    }
    boardIdx += 1
  })
  return pieces;
}
