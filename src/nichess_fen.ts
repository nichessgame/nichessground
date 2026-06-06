import * as cg from './types.js';
import {
  ASSASSIN_ABILITY_POINTS,
  KING_ABILITY_POINTS,
  KNIGHT_ABILITY_POINTS,
  MAGE_ABILITY_POINTS,
  PAWN_ABILITY_POINTS,
  WARRIOR_ABILITY_POINTS,
} from 'nichess';

interface NichessPieceInfo {
  role: cg.Role;
  color: cg.Color;
  abilityPoints: number;
}

const pieceInfo: Partial<Record<string, NichessPieceInfo>> = {
  '0king': { role: 'king', color: 'white', abilityPoints: KING_ABILITY_POINTS },
  '0pawn': { role: 'pawn', color: 'white', abilityPoints: PAWN_ABILITY_POINTS },
  '0mage': { role: 'queen', color: 'white', abilityPoints: MAGE_ABILITY_POINTS },
  '0assassin': { role: 'bishop', color: 'white', abilityPoints: ASSASSIN_ABILITY_POINTS },
  '0knight': { role: 'knight', color: 'white', abilityPoints: KNIGHT_ABILITY_POINTS },
  '0warrior': { role: 'rook', color: 'white', abilityPoints: WARRIOR_ABILITY_POINTS },
  '1king': { role: 'king', color: 'black', abilityPoints: KING_ABILITY_POINTS },
  '1pawn': { role: 'pawn', color: 'black', abilityPoints: PAWN_ABILITY_POINTS },
  '1mage': { role: 'queen', color: 'black', abilityPoints: MAGE_ABILITY_POINTS },
  '1assassin': { role: 'bishop', color: 'black', abilityPoints: ASSASSIN_ABILITY_POINTS },
  '1knight': { role: 'knight', color: 'black', abilityPoints: KNIGHT_ABILITY_POINTS },
  '1warrior': { role: 'rook', color: 'black', abilityPoints: WARRIOR_ABILITY_POINTS },
};

function squareIndexToCoordinates(squareIndex: number): [number, number] {
  const x = squareIndex - Math.floor(squareIndex / 8) * 8;
  const y = Math.floor(squareIndex / 8);
  return [x + 1, y + 1]; // +1 because coordinates shouldn't be 0 indexed here
}

function squareIndexToKey(squareIndex: number): cg.Key {
  const xy = squareIndexToCoordinates(squareIndex);
  const x = xy[0];
  const y = xy[1];
  let file = '';
  switch (x) {
    case 1:
      file = 'a';
      break;
    case 2:
      file = 'b';
      break;
    case 3:
      file = 'c';
      break;
    case 4:
      file = 'd';
      break;
    case 5:
      file = 'e';
      break;
    case 6:
      file = 'f';
      break;
    case 7:
      file = 'g';
      break;
    case 8:
      file = 'h';
      break;
  }
  return (file + y.toString()) as cg.Key;
}

export function read(encodedBoard: string): cg.Pieces {
  const pieces: cg.Pieces = new Map();
  const b1: string = encodedBoard.substring(2);
  const ar1: string[] = b1.split(',');
  ar1.pop(); // last element is an empty string
  let boardIdx = 0;
  ar1.forEach(item => {
    const ar2 = item.split('-');
    if (ar2[0] !== 'empty') {
      const healthPoints = Number(ar2[2]);
      const pieceType: string = ar2[0] + ar2[1];
      const key: cg.Key = squareIndexToKey(boardIdx);
      const info = pieceInfo[pieceType];
      if (info) {
        pieces.set(key, {
          role: info.role,
          color: info.color,
          healthPoints,
          abilityPoints: info.abilityPoints,
        });
      }
    }
    boardIdx += 1;
  });
  return pieces;
}
