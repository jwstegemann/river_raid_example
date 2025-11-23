import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameState, PlayerState, Entity, Bullet, RiverSlice, EnemyType, Particle 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, 
  MAX_FUEL, FUEL_CONSUMPTION_RATE, FUEL_REFILL_RATE,
  INITIAL_SCROLL_SPEED, PLAYER_SPEED_X,
  COLOR_WATER, COLOR_LAND, COLOR_LAND_BORDER,
  BRIDGE_INTERVAL, BULLET_SIZE
} from '../constants';
import { checkCollision, generateRiverSlice, createExplosion } from '../utils/gameUtils';

// --- Sprite Drawing Helpers ---
// Using pixel-rect techniques to simulate sprites without external assets

const drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
};

const drawPlayerSprite = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const w = PLAYER_WIDTH;
    const h = PLAYER_HEIGHT;
    const mid = w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(x + mid, y + 4);
    ctx.lineTo(x + w + 4, y + h + 4);
    ctx.lineTo(x + mid, y + h - 6);
    ctx.lineTo(x - 4, y + h + 4);
    ctx.fill();

    // Body (White/Grey)
    ctx.fillStyle = '#e2e8f0'; 
    ctx.beginPath();
    ctx.moveTo(x + mid, y);
    ctx.lineTo(x + mid + 6, y + h/2);
    ctx.lineTo(x + mid, y + h - 8);
    ctx.lineTo(x + mid - 6, y + h/2);
    ctx.fill();

    // Wings (Yellow/White Accent)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(x + mid, y + 10);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + mid, y + h - 10); // Engine area
    ctx.lineTo(x, y + h);
    ctx.fill();

    // Red Stripe/Cockpit
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + mid - 2, y + 10, 4, 10);
    
    // Engine Exhaust (Dark)
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + mid - 3, y + h - 10, 6, 4);
};

const drawShipSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Hull
    ctx.fillStyle = '#1e293b'; // Slate 800
    ctx.beginPath();
    ctx.moveTo(x, y + h); // Bottom Left
    ctx.lineTo(x + w, y + h); // Bottom Right
    ctx.lineTo(x + w - 4, y + 6); // Top Right (Bow if moving right)
    ctx.lineTo(x + 4, y + 6); // Top Left
    ctx.fill();

    // Deck
    ctx.fillStyle = '#cbd5e1'; // Slate 300
    ctx.fillRect(x + 6, y + 4, w - 12, h - 8);

    // Cabin
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + w/2 - 5, y + h/2 - 8, 10, 8);
    
    // Funnel
    ctx.fillStyle = '#dc2626'; // Red
    ctx.fillRect(x + w/2 - 3, y + h/2 - 14, 6, 6);
};

const drawHeliSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const time = Date.now();
    const bladeOffset = (time / 10) % 10;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 10, y + h + 10, 20, 10);

    // Body
    ctx.fillStyle = '#0f766e'; // Teal 700
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h/2 + 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillRect(x + w/2, y + h/2, 18, 4);
    ctx.fillRect(x + w/2 + 16, y + h/2 - 4, 2, 8); // Tail rotor

    // Cockpit
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(x + w/2 - 4, y + h/2 + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Rotor Blades (Spinning)
    ctx.fillStyle = '#111';
    if (Math.floor(time / 50) % 2 === 0) {
        ctx.fillRect(x, y + 4, w, 2);
        ctx.fillRect(x + w/2 - 1, y, 2, 8);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + w - 2, y + 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + w - 2, y + 2);
        ctx.lineTo(x + 2, y + 6);
        ctx.stroke();
    }
};

const drawJetSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(x + w/2, y + 6);
    ctx.lineTo(x + w + 6, y + h/2 + 6);
    ctx.lineTo(x + w/2, y + h + 6);
    ctx.lineTo(x - 6, y + h/2 + 6);
    ctx.fill();

    // Body
    ctx.fillStyle = '#a855f7'; // Purple jet
    ctx.beginPath();
    ctx.moveTo(x + w/2, y); // Nose
    ctx.lineTo(x + w, y + h/2); // Right wing
    ctx.lineTo(x + w/2, y + h); // Tail
    ctx.lineTo(x, y + h/2); // Left wing
    ctx.fill();

    // Detail
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w/2 - 1, y + 4, 2, h - 8);
};

const drawFuelSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Base
    ctx.fillStyle = '#be123c'; // Rose 700
    ctx.fillRect(x, y, w, h);
    
    // Highlight
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("FUEL", x + w/2, y + h/2);
    
    // Top cap
    ctx.fillStyle = '#881337';
    ctx.fillRect(x + w/2 - 6, y - 4, 12, 4);
};

const drawBridge = (ctx: CanvasRenderingContext2D, y: number) => {
    // Road
    ctx.fillStyle = '#374151'; // Gray 700
    ctx.fillRect(0, y, CANVAS_WIDTH, 24);
    
    // Yellow Lines
    ctx.fillStyle = '#facc15';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, y + 12);
    ctx.lineTo(CANVAS_WIDTH, y + 12);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Supports
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(CANVAS_WIDTH/4, y + 24, 20, 10);
    ctx.fillRect((CANVAS_WIDTH/4)*3, y + 24, 20, 10);
};

const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Trunk
    ctx.fillStyle = '#3f2c22'; // Brown
    ctx.fillRect(x, y, 4, 8);
    // Leaves (Pixel clump)
    ctx.fillStyle = '#15803d'; // Green
    ctx.fillRect(x - 6, y - 8, 16, 8); // Base
    ctx.fillRect(x - 4, y - 14, 12, 6); // Mid
    ctx.fillRect(x - 2, y - 18, 8, 4); // Top
};

const drawHouse = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Walls
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(x, y, 12, 10);
    // Roof
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 6, y - 6);
    ctx.lineTo(x + 14, y);
    ctx.fill();
    // Door
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 4, y + 4, 4, 6);
};


const RiverRaidGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  
  // Game State Refs (Mutable for performance in game loop)
  const gameStateRef = useRef<GameState>(GameState.MENU);
  const playerRef = useRef<PlayerState>({
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: CANVAS_HEIGHT - 150,
    vx: 0,
    vy: INITIAL_SCROLL_SPEED,
    fuel: MAX_FUEL,
    score: 0,
    lives: 3
  });
  
  const riverRef = useRef<RiverSlice[]>([]);
  const entitiesRef = useRef<Entity[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const distanceTraveledRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const levelRef = useRef<number>(1);
  const lastShotTime = useRef<number>(0);

  // React State for UI Overlay (updated less frequently)
  const [uiState, setUiState] = useState<{score: number, fuel: number, lives: number, state: GameState}>({
    score: 0,
    fuel: MAX_FUEL,
    lives: 3,
    state: GameState.MENU
  });

  // Initialization
  const initGame = useCallback(() => {
    gameStateRef.current = GameState.PLAYING;
    playerRef.current = {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: CANVAS_HEIGHT - 150,
      vx: 0,
      vy: INITIAL_SCROLL_SPEED,
      fuel: MAX_FUEL,
      score: 0,
      lives: 3
    };
    entitiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    distanceTraveledRef.current = 0;
    levelRef.current = 1;
    
    // Generate initial river
    const initialRiver: RiverSlice[] = [];
    let currentSlice: RiverSlice = { y: CANVAS_HEIGHT, leftBank: 100, rightBank: CANVAS_WIDTH - 100, island: null, decorations: [] };
    
    // Fill screen plus buffer
    for (let i = 0; i < CANVAS_HEIGHT + 200; i++) {
      currentSlice = generateRiverSlice(currentSlice, 0, 1);
      initialRiver.push(currentSlice);
    }
    riverRef.current = initialRiver;
    
    setUiState(prev => ({ ...prev, state: GameState.PLAYING }));
  }, []);

  const resetAfterDeath = () => {
    playerRef.current.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
    playerRef.current.fuel = MAX_FUEL;
    playerRef.current.vx = 0;
    entitiesRef.current = entitiesRef.current.filter(e => e.y < playerRef.current.y - 300); // Clear nearby enemies
  };

  // Game Loop
  const update = useCallback(() => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    const player = playerRef.current;
    
    // --- 1. Player Input & Movement ---
    if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
      player.x -= PLAYER_SPEED_X;
    }
    if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
      player.x += PLAYER_SPEED_X;
    }
    // Acceleration / Deceleration (affects scrolling speed)
    if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('w')) {
      player.vy = Math.min(player.vy + 0.05, 6); // Slower acceleration
    } else if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('s')) {
      player.vy = Math.max(player.vy - 0.1, 0.5); // Min speed
    } else {
      // Natural deceleration to cruising speed
      if (player.vy > INITIAL_SCROLL_SPEED) player.vy -= 0.02;
      if (player.vy < INITIAL_SCROLL_SPEED) player.vy += 0.02;
    }
    
    // Shoot
    if (keysPressed.current.has(' ') || keysPressed.current.has('Enter')) {
      const now = Date.now();
      if (now - lastShotTime.current > 250) { // Fire rate limit
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x + PLAYER_WIDTH / 2 - 2,
          y: player.y,
          vx: 0,
          vy: -12
        });
        lastShotTime.current = now;
      }
    }

    // --- 2. River Generation & Scrolling ---
    const speed = player.vy;
    distanceTraveledRef.current += speed;
    
    // Move all river slices down
    for (const slice of riverRef.current) {
      slice.y += speed;
    }
    
    // Remove slices that are off-screen (bottom)
    riverRef.current = riverRef.current.filter(slice => slice.y < CANVAS_HEIGHT + 100);
    
    // Add new slices at top
    if (riverRef.current.length > 0) {
      while (riverRef.current[riverRef.current.length - 1].y > -50) {
        const lastSlice = riverRef.current[riverRef.current.length - 1];
        const newSlice = generateRiverSlice(lastSlice, 0, levelRef.current);
        // Ensure strict continuity
        newSlice.y = lastSlice.y - 1; 
        riverRef.current.push(newSlice);
        
        // Spawn Logic (Check strictly on new slice generation)
        // Check for Bridge
        if (Math.abs(distanceTraveledRef.current % BRIDGE_INTERVAL) < speed) {
          entitiesRef.current.push({
              id: Math.random().toString(),
              type: EnemyType.BRIDGE,
              x: 0, // Bridges span full width
              y: newSlice.y,
              width: CANVAS_WIDTH,
              height: 24, // Thinner visual hit box
              markedForDeletion: false
          });
        } else if (Math.random() < 0.03) { // 3% chance per slice
          // Spawn Enemy or Fuel
          const isFuel = Math.random() < 0.25; // 25% chance for fuel
          const type = isFuel ? EnemyType.FUEL_DEPOT : 
                      (Math.random() < 0.5 ? EnemyType.SHIP : (Math.random() < 0.5 ? EnemyType.HELICOPTER : EnemyType.JET));
          
          // Find safe spawn x (in the water)
          const margin = 20;
          const safeMin = newSlice.leftBank + margin;
          const safeMax = newSlice.rightBank - margin;
          
          if (safeMax > safeMin) {
            const spawnX = safeMin + Math.random() * (safeMax - safeMin);
            entitiesRef.current.push({
              id: Math.random().toString(),
              type,
              x: spawnX,
              y: newSlice.y,
              width: isFuel ? 30 : 40,
              height: isFuel ? 50 : 30,
              markedForDeletion: false,
              speedX: type === EnemyType.JET ? (Math.random() > 0.5 ? 2 : -2) : (type === EnemyType.SHIP ? 0.5 : 0)
            });
          }
        }
      }
    }

    // --- 3. Entity Updates ---
    // Entities move down with the river (relative to player)
    entitiesRef.current.forEach(e => {
      e.y += speed;
      
      // Horizontal movement for dynamic enemies
      if (e.speedX) {
        e.x += e.speedX;
        // Simple bounce logic
        if (e.x < 0 || e.x > CANVAS_WIDTH) e.speedX *= -1;
      }
      
      if (e.y > CANVAS_HEIGHT + 50) e.markedForDeletion = true;
    });
    
    bulletsRef.current.forEach(b => {
      b.y += b.vy; // Bullets move up (negative vy)
    });
    bulletsRef.current = bulletsRef.current.filter(b => b.y > -50);

    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // --- 4. Collision Detection ---
    
    // A. Player vs Land
    // Find river slice at player Y
    const playerFeetY = player.y + PLAYER_HEIGHT;
    const playerHeadY = player.y;
    
    const intersectingSlices = riverRef.current.filter(s => s.y >= playerHeadY && s.y <= playerFeetY);
    
    let touchingLand = false;
    for (const slice of intersectingSlices) {
      if (player.x < slice.leftBank || (player.x + PLAYER_WIDTH) > slice.rightBank) {
        touchingLand = true;
      }
      if (slice.island) {
        // More forgiving collision for islands
        if (checkCollision(
          { x: player.x + 5, y: player.y + 5, width: PLAYER_WIDTH - 10, height: PLAYER_HEIGHT - 10 },
          { x: slice.island.left, y: slice.y, width: slice.island.right - slice.island.left, height: 1 }
        )) {
          touchingLand = true;
        }
      }
    }

    if (touchingLand) {
       handleDeath("Crashed into land!");
       return;
    }

    // B. Player vs Entities (Fuel or Crash)
    // Reduce player hitbox slightly for better gameplay feel
    const playerBox = { x: player.x + 4, y: player.y + 4, width: PLAYER_WIDTH - 8, height: PLAYER_HEIGHT - 8 };
    
    entitiesRef.current.forEach(e => {
      const entityBox = { x: e.x, y: e.y, width: e.width, height: e.height };
      
      if (checkCollision(playerBox, entityBox)) {
        if (e.type === EnemyType.FUEL_DEPOT) {
          player.fuel = Math.min(player.fuel + FUEL_REFILL_RATE * 5, MAX_FUEL);
          // Don't delete fuel immediately, let player fly over it
        } else if (e.type === EnemyType.BRIDGE) {
           handleDeath("Crashed into bridge!");
        } else {
           handleDeath(`Crashed into ${e.type.toLowerCase()}!`);
        }
      }
    });

    // C. Bullets vs Entities
    bulletsRef.current.forEach(b => {
      const bulletBox = { x: b.x, y: b.y, width: BULLET_SIZE, height: BULLET_SIZE };
      let hit = false;
      
      entitiesRef.current.forEach(e => {
        if (hit || e.markedForDeletion) return;
        
        const entityBox = { x: e.x, y: e.y, width: e.width, height: e.height };
        
        if (checkCollision(bulletBox, entityBox)) {
          hit = true;
          if (e.type === EnemyType.BRIDGE) {
             e.markedForDeletion = true;
             player.score += 500;
             levelRef.current++; // Increase difficulty
             particlesRef.current.push(...createExplosion(e.x + CANVAS_WIDTH/2, e.y, '#fbbf24'));
          } else {
             e.markedForDeletion = true;
             player.score += (e.type === EnemyType.FUEL_DEPOT ? 80 : 100);
             particlesRef.current.push(...createExplosion(e.x + e.width/2, e.y + e.height/2, e.type === EnemyType.FUEL_DEPOT ? '#f43f5e' : '#fbbf24'));
          }
        }
      });
      
      if (hit) {
         // Bullet disappears
         b.y = -999; 
      }
    });
    
    // Cleanup deleted entities
    entitiesRef.current = entitiesRef.current.filter(e => !e.markedForDeletion);
    bulletsRef.current = bulletsRef.current.filter(b => b.y > -1000);

    // --- 5. Fuel Management ---
    player.fuel -= FUEL_CONSUMPTION_RATE * (speed > 1 ? speed / 2 : 0.5);
    if (player.fuel <= 0) {
      handleDeath("Out of fuel!");
    }

    // Sync UI
    if (Math.random() < 0.1) {
        setUiState({
            score: Math.floor(player.score),
            fuel: Math.floor(player.fuel),
            lives: player.lives,
            state: GameState.PLAYING
        });
    }

  }, []);

  const handleDeath = (reason: string) => {
    // Boom
    particlesRef.current.push(...createExplosion(playerRef.current.x + PLAYER_WIDTH/2, playerRef.current.y + PLAYER_HEIGHT/2, '#ef4444'));
    
    playerRef.current.lives -= 1;
    if (playerRef.current.lives <= 0) {
      gameStateRef.current = GameState.GAME_OVER;
      setUiState(prev => ({ ...prev, lives: 0, state: GameState.GAME_OVER }));
    } else {
      // Respawn logic
      resetAfterDeath();
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Safe guard against empty river array
    if (!riverRef.current || riverRef.current.length < 2) return;

    // Clear background (Land color)
    ctx.fillStyle = COLOR_LAND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 0. Draw Land Textures (Trees, Houses) from Slices
    // Optimization: Only draw decoration if it is on land. 
    // Since decorations are stored in slice, they move with land.
    for (const slice of riverRef.current) {
        if (slice.decorations) {
            for (const d of slice.decorations) {
                if (d.type === 'TREE') drawTree(ctx, d.x, slice.y);
                if (d.type === 'HOUSE') drawHouse(ctx, d.x, slice.y);
            }
        }
    }

    // 1. Draw River
    ctx.fillStyle = COLOR_WATER;
    ctx.beginPath();
    
    // Left Bank Path
    if (riverRef.current[0]) {
      ctx.moveTo(riverRef.current[0].leftBank, riverRef.current[0].y);
      for (const slice of riverRef.current) {
          ctx.lineTo(slice.leftBank, slice.y);
      }
      // Cross over to right bank at top
      const topSlice = riverRef.current[riverRef.current.length-1];
      ctx.lineTo(topSlice.rightBank, topSlice.y);
      
      // Right Bank Path (downwards)
      for (let i = riverRef.current.length - 1; i >= 0; i--) {
          const slice = riverRef.current[i];
          ctx.lineTo(slice.rightBank, slice.y);
      }
      ctx.closePath();
      ctx.fill();

      // Draw Islands
      ctx.fillStyle = COLOR_LAND;
      for (const slice of riverRef.current) {
          if (slice.island) {
              ctx.fillRect(slice.island.left, slice.y, slice.island.right - slice.island.left, 2); 
              // Island Decoration
              if (slice.decorations) {
                 for (const d of slice.decorations) {
                    if (d.x > slice.island.left && d.x < slice.island.right) {
                       drawTree(ctx, d.x, slice.y);
                    }
                 }
              }
          }
      }
      
      // Draw Border details (Darker edge for depth)
      ctx.fillStyle = COLOR_LAND_BORDER;
      for (const slice of riverRef.current) {
        drawRect(ctx, slice.leftBank - 6, slice.y, 6, 2, COLOR_LAND_BORDER);
        drawRect(ctx, slice.rightBank, slice.y, 6, 2, COLOR_LAND_BORDER);
      }
    }

    // 2. Draw Entities
    entitiesRef.current.forEach(e => {
      if (e.type === EnemyType.BRIDGE) {
        drawBridge(ctx, e.y);
      } else if (e.type === EnemyType.FUEL_DEPOT) {
        drawFuelSprite(ctx, e.x, e.y, e.width, e.height);
      } else if (e.type === EnemyType.SHIP) {
        drawShipSprite(ctx, e.x, e.y, e.width, e.height);
      } else if (e.type === EnemyType.HELICOPTER) {
         drawHeliSprite(ctx, e.x, e.y, e.width, e.height);
      } else if (e.type === EnemyType.JET) {
         drawJetSprite(ctx, e.x, e.y, e.width, e.height);
      }
    });

    // 3. Draw Player
    if (gameStateRef.current === GameState.PLAYING) {
        drawPlayerSprite(ctx, playerRef.current.x, playerRef.current.y);
    }

    // 4. Draw Bullets
    ctx.fillStyle = '#fef08a'; // Lighter yellow
    bulletsRef.current.forEach(b => {
      ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE*2);
    });

    // 5. Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1.0;
    });

  }, []);

  const loop = useCallback((time: number) => {
    update();
    draw();
    animationFrameId.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    // Initialize river immediately so the menu has a background
    // and draw() doesn't crash on first frame
    const initialRiver: RiverSlice[] = [];
    let currentSlice: RiverSlice = { y: CANVAS_HEIGHT, leftBank: 100, rightBank: CANVAS_WIDTH - 100, island: null, decorations: [] };
    
    // Fill screen plus buffer
    for (let i = 0; i < CANVAS_HEIGHT + 200; i++) {
      currentSlice = generateRiverSlice(currentSlice, 0, 1);
      initialRiver.push(currentSlice);
    }
    riverRef.current = initialRiver;

    animationFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [loop]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      if (gameStateRef.current === GameState.MENU || gameStateRef.current === GameState.GAME_OVER) {
         if (e.key === 'Enter') {
            initGame();
         }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initGame]);

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-gray-900 select-none">
      
      {/* UI Overlay */}
      <div className="absolute top-4 w-[600px] flex justify-between px-4 z-10 font-mono text-white pointer-events-none">
        <div className="flex flex-col drop-shadow-md">
           <span className="text-xl font-bold text-yellow-400">SCORE</span>
           <span className="text-2xl">{uiState.score.toString().padStart(6, '0')}</span>
        </div>
        
        {/* Fuel Gauge */}
        <div className="flex flex-col items-center w-64 drop-shadow-md">
           <span className="text-sm mb-1 font-bold">FUEL</span>
           <div className="w-full h-6 bg-gray-800 border-2 border-gray-500 relative rounded-sm overflow-hidden">
              <div 
                className={`h-full transition-all duration-100 ${uiState.fuel < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-yellow-500 to-green-500'}`} 
                style={{ width: `${Math.max(0, (uiState.fuel / MAX_FUEL) * 100)}%` }}
              />
              {/* Tick marks */}
              <div className="absolute inset-0 flex justify-between px-2">
                 <div className="w-0.5 h-full bg-black/20"></div>
                 <div className="w-0.5 h-full bg-black/20"></div>
                 <div className="w-0.5 h-full bg-black/20"></div>
                 <div className="w-0.5 h-full bg-black/20"></div>
              </div>
           </div>
        </div>

        <div className="flex flex-col items-end drop-shadow-md">
           <span className="text-xl font-bold text-blue-400">LIVES</span>
           <div className="flex gap-2">
             {Array.from({length: Math.max(0, uiState.lives)}).map((_, i) => (
               <div key={i} className="w-6 h-6 bg-gray-200" style={{
                   clipPath: 'polygon(50% 0%, 100% 100%, 50% 80%, 0% 100%)'
               }}></div>
             ))}
           </div>
        </div>
      </div>

      {/* Menus */}
      {uiState.state === GameState.MENU && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 tracking-tighter italic transform -skew-x-12 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]" style={{fontFamily: "'Press Start 2P', cursive"}}>RIVER RAID</h1>
          <h2 className="text-2xl mb-8 text-blue-300 tracking-widest">REMASTERED</h2>
          <div className="flex flex-col gap-4 text-center text-gray-300 font-mono border-2 border-gray-600 p-8 rounded bg-gray-900/90">
            <p>ARROWS / WASD to Steer & Control Speed</p>
            <p>SPACE to Shoot</p>
            <div className="flex gap-4 justify-center text-sm my-2">
               <div className="flex flex-col items-center"><div className="w-4 h-4 bg-red-500 mb-1"></div><span>Avoid Land</span></div>
               <div className="flex flex-col items-center"><div className="w-4 h-4 bg-rose-600 mb-1"></div><span>Collect Fuel</span></div>
               <div className="flex flex-col items-center"><div className="w-4 h-4 bg-slate-700 mb-1"></div><span>Destroy Ships</span></div>
            </div>
            <p className="mt-4 animate-pulse text-yellow-400 font-bold text-lg">PRESS ENTER TO START</p>
          </div>
        </div>
      )}

      {uiState.state === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-900/80 text-white backdrop-blur-sm">
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">GAME OVER</h1>
          <p className="text-2xl mb-4 font-mono">FINAL SCORE: {uiState.score}</p>
          <p className="animate-pulse font-bold mt-4">PRESS ENTER TO RESTART</p>
        </div>
      )}

      {/* Main Game Canvas */}
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        className="border-4 border-gray-800 shadow-2xl bg-[#4d7c0f] rounded-sm max-h-[95vh] w-auto aspect-[3/4]"
      />
      
    </div>
  );
};

export default RiverRaidGame;