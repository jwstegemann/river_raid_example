export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  LEVEL_COMPLETE
}

export enum EnemyType {
  SHIP = 'SHIP',
  HELICOPTER = 'HELICOPTER',
  JET = 'JET',
  FUEL_DEPOT = 'FUEL_DEPOT',
  BRIDGE = 'BRIDGE'
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: EnemyType;
  markedForDeletion: boolean;
  speedX?: number; // For moving enemies
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface Decoration {
  x: number;
  type: 'TREE' | 'HOUSE';
}

export interface RiverSlice {
  y: number;
  leftBank: number; // x coordinate of left bank edge
  rightBank: number; // x coordinate of right bank edge
  island: { left: number; right: number } | null;
  decorations: Decoration[];
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number; // Used for speed modulation (scroll speed)
  fuel: number;
  score: number;
  lives: number;
}