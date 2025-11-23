export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;

// Game Balance
export const FPS = 60;
export const INITIAL_SCROLL_SPEED = 1.5; // Slower start
export const MAX_SCROLL_SPEED = 5;
export const MIN_SCROLL_SPEED = 1;
export const PLAYER_SPEED_X = 5;

// Player
export const PLAYER_WIDTH = 32; // Slightly adjusted for pixel grid
export const PLAYER_HEIGHT = 36;
export const MAX_FUEL = 100;
export const FUEL_CONSUMPTION_RATE = 0.04; // Reduced slightly due to slower speed
export const FUEL_REFILL_RATE = 0.5;

// Entities
export const BULLET_SPEED = 12;
export const BULLET_SIZE = 4;
export const ENEMY_SPAWN_CHANCE = 0.02; 

// Colors
export const COLOR_WATER = '#3b82f6'; // blue-500
export const COLOR_LAND = '#84cc16'; // lime-500 (Lighter to contrast with trees)
export const COLOR_LAND_BORDER = '#4d7c0f'; // lime-700
export const COLOR_PLAYER = '#e5e7eb'; // gray-200
export const COLOR_PLAYER_DETAIL = '#ef4444'; // red-500
export const COLOR_FUEL_TEXT = '#facc15'; // yellow-400

export const BRIDGE_INTERVAL = 3000; // pixels of river length between bridges