import { State } from './state.js';
import { key2pos, createEl, posToTranslate as posToTranslateFromBounds, translate } from './util.js';
import { whitePov } from './board.js';
import { AnimCurrent, AnimVectors, AnimVector, AnimFadings } from './anim.js';
import { DragCurrent } from './drag.js';
import * as cg from './types.js';

type PieceName = string; // `$color $role`

// ported from https://github.com/lichess-org/lichobile/blob/master/src/chessground/render.ts
// in case of bugs, blame @veloce
export function render(s: State): void {
  const bounds = s.dom.bounds();
  const asWhite: boolean = whitePov(s),
    posToTranslate = posToTranslateFromBounds(bounds),
    boardEl: HTMLElement = s.dom.elements.board,
    pieces: cg.Pieces = s.pieces,
    curAnim: AnimCurrent | undefined = s.animation.current,
    anims: AnimVectors = curAnim ? curAnim.plan.anims : new Map(),
    fadings: AnimFadings = curAnim ? curAnim.plan.fadings : new Map(),
    curDrag: DragCurrent | undefined = s.draggable.current,
    squares: cg.SquareClasses = computeSquareClasses(s),
    samePieces: Set<cg.Key> = new Set(),
    sameSquares: Set<cg.Key> = new Set(),
    movedPieces: Map<PieceName, cg.PieceNode[]> = new Map(),
    movedSquares: Map<string, cg.SquareNode[]> = new Map(); // by class name
  let k: cg.Key,
    el: cg.PieceNode | cg.SquareNode | undefined,
    pieceAtKey: cg.Piece | undefined,
    elPieceName: PieceName,
    anim: AnimVector | undefined,
    fading: cg.Piece | undefined,
    pMvdset: cg.PieceNode[] | undefined,
    pMvd: cg.PieceNode | undefined,
    sMvdset: cg.SquareNode[] | undefined,
    sMvd: cg.SquareNode | undefined;

  // walk over all board dom elements, apply animations and flag moved pieces
  el = boardEl.firstChild as cg.PieceNode | cg.SquareNode | undefined;
  updateBoardFontSize(boardEl, bounds.width);

  while (el) {
    k = el.cgKey;
    if (isPieceNode(el)) {
      pieceAtKey = pieces.get(k);
      updatePieceText(el, pieceAtKey, s.healthAndAbilityPointsText);
      anim = anims.get(k);
      fading = fadings.get(k);
      elPieceName = el.cgPiece;
      // if piece not being dragged anymore, remove dragging style
      if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
        el.classList.remove('dragging');
        translate(el, posToTranslate(key2pos(k), asWhite));
        el.cgDragging = false;
      }
      // remove fading class if it still remains
      if (!fading && el.cgFading) {
        el.cgFading = false;
        el.classList.remove('fading');
      }
      // there is now a piece at this dom key
      if (pieceAtKey) {
        // continue animation if already animating and same piece
        // (otherwise it could animate a captured piece)
        if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
          const pos = key2pos(k);
          pos[0] += anim[2];
          pos[1] += anim[3];
          el.classList.add('anim');
          translate(el, posToTranslate(pos, asWhite));
        } else if (el.cgAnimating) {
          el.cgAnimating = false;
          el.classList.remove('anim');
          translate(el, posToTranslate(key2pos(k), asWhite));
          if (s.addPieceZIndex) el.style.zIndex = posZIndex(key2pos(k), asWhite);
        }
        // same piece: flag as same
        if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
          samePieces.add(k);
        }
        // different piece: flag as moved unless it is a fading piece
        else {
          if (fading && elPieceName === pieceNameOf(fading)) {
            el.classList.add('fading');
            el.cgFading = true;
          } else {
            appendValue(movedPieces, elPieceName, el);
          }
        }
      }
      // no piece: flag as moved
      else {
        appendValue(movedPieces, elPieceName, el);
      }
    } else if (isSquareNode(el)) {
      const cn = el.className;
      if (squares.get(k) === cn) sameSquares.add(k);
      else appendValue(movedSquares, cn, el);
    }
    el = el.nextSibling as cg.PieceNode | cg.SquareNode | undefined;
  }

  // walk over all squares in current set, apply dom changes to moved squares
  // or append new squares
  for (const [sk, className] of squares) {
    if (!sameSquares.has(sk)) {
      sMvdset = movedSquares.get(className);
      sMvd = sMvdset && sMvdset.pop();
      const translation = posToTranslate(key2pos(sk), asWhite);
      if (sMvd) {
        sMvd.cgKey = sk;
        translate(sMvd, translation);
      } else {
        const squareNode = createEl('square', className) as cg.SquareNode;
        squareNode.cgKey = sk;
        translate(squareNode, translation);
        boardEl.insertBefore(squareNode, boardEl.firstChild);
      }
    }
  }

  // walk over all pieces in current set, apply dom changes to moved pieces
  // or append new pieces
  for (const [k, p] of pieces) {
    anim = anims.get(k);
    if (!samePieces.has(k)) {
      pMvdset = movedPieces.get(pieceNameOf(p));
      pMvd = pMvdset && pMvdset.pop();
      // a same piece was moved
      if (pMvd) {
        // apply dom changes
        pMvd.cgKey = k;
        updatePieceText(pMvd, p, s.healthAndAbilityPointsText);
        if (pMvd.cgFading) {
          pMvd.classList.remove('fading');
          pMvd.cgFading = false;
        }
        const pos = key2pos(k);
        if (s.addPieceZIndex) pMvd.style.zIndex = posZIndex(pos, asWhite);
        if (anim) {
          pMvd.cgAnimating = true;
          pMvd.classList.add('anim');
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pMvd, posToTranslate(pos, asWhite));
      }
      // no piece in moved obj: insert the new piece
      // assumes the new piece is not being dragged
      else {
        const pieceName = pieceNameOf(p),
          pieceNode = createEl('piece', pieceName) as cg.PieceNode,
          pos = key2pos(k);

        pieceNode.cgPiece = pieceName;
        pieceNode.cgKey = k;
        if (anim) {
          pieceNode.cgAnimating = true;
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pieceNode, posToTranslate(pos, asWhite));

        if (s.addPieceZIndex) pieceNode.style.zIndex = posZIndex(pos, asWhite);

        updatePieceText(pieceNode, p, s.healthAndAbilityPointsText);

        boardEl.appendChild(pieceNode);
      }
    }
  }

  // remove any element that remains in the moved sets
  for (const nodes of movedPieces.values()) removeNodes(s, nodes);
  for (const nodes of movedSquares.values()) removeNodes(s, nodes);
}

export function renderResized(s: State): void {
  const bounds = s.dom.bounds();
  const asWhite: boolean = whitePov(s),
    posToTranslate = posToTranslateFromBounds(bounds);
  updateBoardFontSize(s.dom.elements.board, bounds.width);
  let el = s.dom.elements.board.firstChild as cg.PieceNode | cg.SquareNode | undefined;
  while (el) {
    if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
      translate(el, posToTranslate(key2pos(el.cgKey), asWhite));
    }
    el = el.nextSibling as cg.PieceNode | cg.SquareNode | undefined;
  }
}

export function updateBounds(s: State): void {
  const bounds = s.dom.elements.wrap.getBoundingClientRect();
  const container = s.dom.elements.container;
  const ratio = bounds.height / bounds.width;
  const width = (Math.floor((bounds.width * window.devicePixelRatio) / 8) * 8) / window.devicePixelRatio;
  const height = width * ratio;
  container.style.width = width + 'px';
  container.style.height = height + 'px';
  s.dom.bounds.clear();

  s.addDimensionsCssVarsTo?.style.setProperty('---cg-width', width + 'px');
  s.addDimensionsCssVarsTo?.style.setProperty('---cg-height', height + 'px');
}

const isPieceNode = (el: cg.PieceNode | cg.SquareNode): el is cg.PieceNode => el.tagName === 'PIECE';
const isSquareNode = (el: cg.PieceNode | cg.SquareNode): el is cg.SquareNode => el.tagName === 'SQUARE';

const hpClass = 'cg-health-points';
const apClass = 'cg-ability-points';
const boardFontSizes = new WeakMap<HTMLElement, string>();

interface PointsTextThemeStyle {
  color: string;
  abilityColor: string;
  fontSize: string;
  fontWeight: string;
  textOutline: string;
  abilityTextOutline: string;
  textDepth?: string;
  abilityTextDepth?: string;
}

const pointsTextThemes: Record<cg.PointsTextTheme, PointsTextThemeStyle> = {
  'light-gold-1': {
    color: '#ffe66f',
    abilityColor: '#8fd8ff',
    fontSize: '0.94em',
    fontWeight: '900',
    textOutline: pointsTextOutline('rgba(82, 54, 0, 0.66)', '0.026em'),
    abilityTextOutline: pointsTextOutline('rgba(0, 58, 96, 0.62)', '0.026em'),
    textDepth: '0 0.045em 0.035em rgba(82, 54, 0, 0.62)',
    abilityTextDepth: '0 0.045em 0.035em rgba(0, 48, 80, 0.6)',
  },
  'light-gold-2': {
    color: '#ffe66f',
    abilityColor: '#8fd8ff',
    fontSize: '0.94em',
    fontWeight: '900',
    textOutline: pointsTextOutline('rgba(70, 45, 0, 0.76)', '0.032em'),
    abilityTextOutline: pointsTextOutline('rgba(0, 48, 82, 0.72)', '0.032em'),
    textDepth: '0 0.052em 0.038em rgba(65, 42, 0, 0.68)',
    abilityTextDepth: '0 0.052em 0.038em rgba(0, 38, 66, 0.68)',
  },
  'dark-gold-1': {
    color: '#f2c94c',
    abilityColor: '#65bff0',
    fontSize: '0.94em',
    fontWeight: '900',
    textOutline: pointsTextOutline('rgba(82, 54, 0, 0.66)', '0.026em'),
    abilityTextOutline: pointsTextOutline('rgba(0, 58, 96, 0.62)', '0.026em'),
    textDepth: '0 0.045em 0.035em rgba(82, 54, 0, 0.62)',
    abilityTextDepth: '0 0.045em 0.035em rgba(0, 48, 80, 0.6)',
  },
  'dark-gold-2': {
    color: '#f2c94c',
    abilityColor: '#65bff0',
    fontSize: '0.94em',
    fontWeight: '900',
    textOutline: pointsTextOutline('rgba(70, 45, 0, 0.76)', '0.032em'),
    abilityTextOutline: pointsTextOutline('rgba(0, 48, 82, 0.72)', '0.032em'),
    textDepth: '0 0.052em 0.038em rgba(65, 42, 0, 0.68)',
    abilityTextDepth: '0 0.052em 0.038em rgba(0, 38, 66, 0.68)',
  },
};

function pointsTextOutline(color: string, size: string): string {
  return [
    `0 -${size} 0 ${color}`,
    `-${size} 0 0 ${color}`,
    `${size} 0 0 ${color}`,
    `0 ${size} 0 ${color}`,
  ].join(', ');
}

const basePointsTextStyle = `
  position: absolute;
  box-sizing: border-box;
  display: block;
  border: 0;
  background: transparent;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  box-shadow: none;
  pointer-events: none;
`;

type PieceTextKind = 'health' | 'ability';

interface PointLabelState {
  el?: HTMLElement;
  points?: number;
  visible?: boolean;
  styleKey?: string;
}

type PointLabelCache = Record<PieceTextKind, PointLabelState>;

const pointLabelCaches = new WeakMap<cg.PieceNode, PointLabelCache>();
const pieceTextStates = new WeakMap<cg.PieceNode, PieceTextState>();

interface PieceTextState {
  healthPoints?: number;
  abilityPoints?: number;
  healthVisible: boolean;
  abilityVisible: boolean;
  theme: cg.PointsTextTheme;
}

function updateBoardFontSize(boardEl: HTMLElement, boundsWidth: number): void {
  const width = (Math.floor((boundsWidth * window.devicePixelRatio) / 8) * 8) / window.devicePixelRatio;
  const fontSize = `${Math.floor(width / 20)}px`;

  if (boardFontSizes.get(boardEl) !== fontSize) {
    boardEl.style.fontSize = fontSize;
    boardFontSizes.set(boardEl, fontSize);
  }
}

function pieceTextStyle(config: cg.HealthAndAbilityPointsTextConfig, kind: PieceTextKind): string {
  const theme = pointsTextThemes[config.theme || 'light-gold-2'];
  const isAbility = kind === 'ability';
  const textOutline = isAbility ? theme.abilityTextOutline : theme.textOutline;
  const textDepth = isAbility ? theme.abilityTextDepth : theme.textDepth;
  const textShadow = textDepth ? `${textOutline}, ${textDepth}` : textOutline;

  return `
    ${basePointsTextStyle}
    ${isAbility ? 'right: 3%; bottom: 4%;' : 'left: 3%; top: 4%;'}
    color: ${isAbility ? theme.abilityColor : theme.color};
    font-size: ${theme.fontSize};
    font-weight: ${theme.fontWeight};
    text-shadow: ${textShadow};
    -webkit-font-smoothing: antialiased;
  `;
}

function updatePieceText(
  pieceNode: cg.PieceNode,
  piece: cg.Piece | undefined,
  config: cg.HealthAndAbilityPointsTextConfig,
): void {
  const nextState: PieceTextState = {
    healthPoints: piece?.healthPoints,
    abilityPoints: piece?.abilityPoints,
    healthVisible: config.healthPointsVisible !== false,
    abilityVisible: config.abilityPointsVisible === true,
    theme: config.theme || 'light-gold-2',
  };

  if (
    samePieceTextState(pieceTextStates.get(pieceNode), nextState) &&
    hasCurrentPointLabels(pieceNode, nextState)
  ) {
    return;
  }

  pieceTextStates.set(pieceNode, nextState);
  updatePointLabel(pieceNode, hpClass, nextState.healthPoints, nextState.healthVisible, config, 'health');
  updatePointLabel(pieceNode, apClass, nextState.abilityPoints, nextState.abilityVisible, config, 'ability');
}

function samePieceTextState(prev: PieceTextState | undefined, next: PieceTextState): boolean {
  return (
    !!prev &&
    prev.healthPoints === next.healthPoints &&
    prev.abilityPoints === next.abilityPoints &&
    prev.healthVisible === next.healthVisible &&
    prev.abilityVisible === next.abilityVisible &&
    prev.theme === next.theme
  );
}

function hasCurrentPointLabels(pieceNode: cg.PieceNode, state: PieceTextState): boolean {
  if (state.healthVisible && state.healthPoints !== undefined && !hasPointLabel(pieceNode, hpClass))
    return false;
  if (state.abilityVisible && state.abilityPoints !== undefined && !hasPointLabel(pieceNode, apClass))
    return false;
  return true;
}

function hasPointLabel(pieceNode: cg.PieceNode, className: string): boolean {
  const cache = pointLabelCaches.get(pieceNode);
  const label = className === hpClass ? cache?.health.el : cache?.ability.el;
  return label?.parentElement === pieceNode;
}

function updatePointLabel(
  pieceNode: cg.PieceNode,
  className: string,
  points: number | undefined,
  visible: boolean,
  config: cg.HealthAndAbilityPointsTextConfig,
  kind: PieceTextKind,
): void {
  const state = getPointLabelState(pieceNode, className, kind);

  if (!visible || points === undefined) {
    if (state.visible || state.el) state.el?.remove();
    state.el = undefined;
    state.points = undefined;
    state.visible = false;
    state.styleKey = undefined;
    return;
  }

  if (!state.el) {
    state.el = document.createElement('div');
    state.el.className = className;
    pieceNode.insertBefore(state.el, pieceNode.firstChild);
  }

  const styleKey = `${config.theme || 'light-gold-2'}:${kind}`;
  if (!state.visible || state.styleKey !== styleKey || state.el.className !== className) {
    state.el.className = className;
    state.el.style.cssText = pieceTextStyle(config, kind);
    state.styleKey = styleKey;
  }
  if (!state.visible || state.points !== points) {
    state.el.textContent = points.toString();
    state.points = points;
  }
  state.visible = true;
}

function getPointLabelState(
  pieceNode: cg.PieceNode,
  className: string,
  kind: PieceTextKind,
): PointLabelState {
  let cache = pointLabelCaches.get(pieceNode);
  if (!cache) {
    cache = { health: {}, ability: {} };
    pointLabelCaches.set(pieceNode, cache);
  }
  const state = cache[kind];
  if (state.el?.parentElement === pieceNode) return state;

  state.el = findPointLabel(pieceNode, className);
  state.points = undefined;
  state.visible = !!state.el;
  state.styleKey = undefined;
  return state;
}

function findPointLabel(pieceNode: cg.PieceNode, className: string): HTMLElement | undefined {
  let label: HTMLElement | undefined;
  let child = pieceNode.firstElementChild;
  while (child) {
    const next = child.nextElementSibling;
    if (
      child instanceof HTMLElement &&
      (child.className === className || isLegacyHealthText(child, className))
    ) {
      if (label) child.remove();
      else label = child;
    }
    child = next;
  }
  return label;
}

function isLegacyHealthText(el: HTMLElement, className: string): boolean {
  return className === hpClass && el.tagName === 'DIV' && /^\d+$/.test(el.textContent);
}

function removeNodes(s: State, nodes: HTMLElement[]): void {
  for (const node of nodes) s.dom.elements.board.removeChild(node);
}

function posZIndex(pos: cg.Pos, asWhite: boolean): string {
  const minZ = 3;
  const rank = pos[1];
  const z = asWhite ? minZ + 7 - rank : minZ + rank;

  return `${z}`;
}

const pieceNameOf = (piece: cg.Piece): string => `${piece.color} ${piece.role}`;

function computeSquareClasses(s: State): cg.SquareClasses {
  const squares: cg.SquareClasses = new Map();
  if (s.lastMove && s.highlight.lastMove)
    for (const k of s.lastMove) {
      addSquare(squares, k, 'last-move');
    }
  if (s.check && s.highlight.check) addSquare(squares, s.check, 'check');
  if (s.selected) {
    addSquare(squares, s.selected, 'selected');
    if (s.movable.showDests) {
      const dests = s.movable.dests?.get(s.selected);
      if (dests)
        for (const k of dests) {
          addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
        }
      const pDests = s.premovable.customDests?.get(s.selected) ?? s.premovable.dests;
      if (pDests)
        for (const k of pDests) {
          addSquare(squares, k, 'premove-dest' + (s.pieces.has(k) ? ' oc' : ''));
        }
    }
  }
  const premove = s.premovable.current;
  if (premove) for (const k of premove) addSquare(squares, k, 'current-premove');
  else if (s.predroppable.current) addSquare(squares, s.predroppable.current.key, 'current-premove');

  const o = s.exploding;
  if (o) for (const k of o.keys) addSquare(squares, k, 'exploding' + o.stage);

  if (s.highlight.custom) {
    s.highlight.custom.forEach((v: string, k: cg.Key) => {
      addSquare(squares, k, v);
    });
  }

  return squares;
}

function addSquare(squares: cg.SquareClasses, key: cg.Key, klass: string): void {
  const classes = squares.get(key);
  if (classes) squares.set(key, `${classes} ${klass}`);
  else squares.set(key, klass);
}

function appendValue<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}
