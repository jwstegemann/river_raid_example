import { Entity, EnemyType, Point, Size, RiverSlice, Particle, Decoration } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

export const checkCollision = (
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
};

export const generateRiverSlice = (prevSlice: RiverSlice, noiseValue: number, difficulty: number): RiverSlice => {
  // Simple procedural river generation
  const maxChange = 2; // How jagged the river is
  const baseWidth = 250 - (difficulty * 10); // Gets narrower as levels progress
  const minWidth = 100;

  // Calculate new center based on previous + noise
  let center = (prevSlice.leftBank + prevSlice.rightBank) / 2;
  
  // Wander
  center += (Math.random() - 0.5) * maxChange * 5;
  
  // Keep center within bounds with padding
  const padding = baseWidth / 2 + 20;
  if (center < padding) center = padding;
  if (center > CANVAS_WIDTH - padding) center = CANVAS_WIDTH - padding;

  let width = (prevSlice.rightBank - prevSlice.leftBank);
  // Vary width slightly
  width += (Math.random() - 0.5) * 4;
  if (width > baseWidth + 50) width = baseWidth + 50;
  if (width < Math.max(minWidth, baseWidth - 50)) width = Math.max(minWidth, baseWidth - 50);

  // Island generation logic (simple)
  let island = null;
  // If we were already in an island sequence, continue it, otherwise small chance to start
  if (prevSlice.island) {
    // Continue island
    // Check if island should end (merge back)
    if (Math.random() < 0.01) {
       island = null;
    } else {
       island = {
         left: center - 20 + (Math.random() - 0.5) * 2,
         right: center + 20 + (Math.random() - 0.5) * 2
       };
    }
  } else {
    // Start new island only if river is wide enough
    if (width > 180 && Math.random() < 0.005) {
      island = {
        left: center - 10,
        right: center + 10
      };
    }
  }

  // Generate Decorations (Trees/Houses on land)
  const decorations: Decoration[] = [];
  
  // Left bank decoration
  if (Math.random() < 0.05) {
     const dist = 10 + Math.random() * 100;
     decorations.push({
         x: (prevSlice.leftBank) - dist,
         type: Math.random() < 0.8 ? 'TREE' : 'HOUSE'
     });
  }

  // Right bank decoration
  if (Math.random() < 0.05) {
     const dist = 10 + Math.random() * 100;
     decorations.push({
         x: (prevSlice.rightBank) + dist,
         type: Math.random() < 0.8 ? 'TREE' : 'HOUSE'
     });
  }
  
  // Island Decoration
  if (island && Math.random() < 0.1) {
      decorations.push({
          x: island.left + (island.right - island.left)/2 - 2, // approximate center
          type: 'TREE'
      });
  }

  return {
    y: prevSlice.y - 1, // Moving upwards in world space (renderer draws relative to player)
    leftBank: center - width / 2,
    rightBank: center + width / 2,
    island,
    decorations
  };
};

export const createExplosion = (x: number, y: number, color: string): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0 + Math.random() * 0.5,
      color: Math.random() > 0.5 ? color : '#ffffff' // Mix white smoke
    });
  }
  return particles;
};