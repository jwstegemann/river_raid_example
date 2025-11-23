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

const drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
};

const drawPlayerSprite = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const w = PLAYER_WIDTH;
    const h = PLAYER_HEIGHT;
    const cx = x + w/2;

    // Shadow (offset)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, y + 10);
    ctx.lineTo(x + w, y + h + 8);
    ctx.lineTo(cx, y + h - 2);
    ctx.lineTo(x, y + h + 8);
    ctx.fill();

    // Fuselage (Main Body)
    ctx.fillStyle = '#e2e8f0'; // Slate 200
    ctx.beginPath();
    ctx.moveTo(cx, y); // Nose
    ctx.lineTo(cx + 4, y + 10);
    ctx.lineTo(cx + 4, y + h - 6);
    ctx.lineTo(cx - 4, y + h - 6);
    ctx.lineTo(cx - 4, y + 10);
    ctx.fill();

    // Wings (Swept back)
    ctx.fillStyle = '#94a3b8'; // Slate 400
    ctx.beginPath();
    ctx.moveTo(cx, y + 12);
    ctx.lineTo(x + w, y + h - 4);
    ctx.lineTo(cx + 5, y + h - 8);
    ctx.lineTo(cx, y + h - 8);
    ctx.lineTo(cx - 5, y + h - 8);
    ctx.lineTo(x, y + h - 4);
    ctx.fill();

    // Tail Stabilizers
    ctx.fillStyle = '#64748b'; // Slate 500
    ctx.beginPath();
    ctx.moveTo(cx, y + h - 16);
    ctx.lineTo(cx + 10, y + h);
    ctx.lineTo(cx - 10, y + h);
    ctx.fill();

    // Vertical Fin Highlight
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx, y + h - 14);
    ctx.lineTo(cx + 2, y + h - 2);
    ctx.lineTo(cx - 2, y + h - 2);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#0ea5e9'; // Sky 500
    ctx.beginPath();
    ctx.moveTo(cx, y + 6);
    ctx.lineTo(cx + 3, y + 12);
    ctx.lineTo(cx, y + 14);
    ctx.lineTo(cx - 3, y + 12);
    ctx.fill();
    
    // Red Accents on Wingtips
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, y + h - 6, 3, 4);
    ctx.fillRect(x + w - 3, y + h - 6, 3, 4);
    
    // Engine flame
    ctx.fillStyle = `rgba(251, 146, 60, ${Math.random() * 0.7 + 0.3})`;
    ctx.beginPath();
    ctx.moveTo(cx - 3, y + h);
    ctx.lineTo(cx, y + h + 8 + Math.random()*6);
    ctx.lineTo(cx + 3, y + h);
    ctx.fill();
};

const drawShipSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Side profile of a military ship
    const deckH = h * 0.5;
    
    // Water ripple / Shadow
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y + h - 2, w, 2);

    // Hull
    ctx.fillStyle = '#374151'; // Gray 700
    ctx.beginPath();
    ctx.moveTo(x, y + deckH); // Stern
    ctx.lineTo(x + 5, y + h); // Waterline stern
    ctx.lineTo(x + w - 10, y + h); // Waterline bow
    ctx.lineTo(x + w, y + deckH); // Bow tip
    ctx.fill();

    // Deck stripe
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(x + 2, y + deckH, w - 4, 3);

    // Superstructure (Bridge)
    ctx.fillStyle = '#9ca3af'; // Gray 400
    ctx.fillRect(x + 10, y + 4, 14, deckH - 4);
    
    // Windows
    ctx.fillStyle = '#1f2937'; // Dark windows
    ctx.fillRect(x + 12, y + 8, 2, 2);
    ctx.fillRect(x + 16, y + 8, 2, 2);
    ctx.fillRect(x + 20, y + 8, 2, 2);

    // Mast
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(x + 16, y, 2, 6);
    ctx.fillRect(x + 12, y + 2, 10, 1);

    // Cannon (Front)
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(x + w - 12, y + deckH - 2, 4, 0, Math.PI, true);
    ctx.fill();
    ctx.fillRect(x + w - 12, y + deckH - 4, 8, 2); // Barrel
};

const drawHeliSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Side view helicopter
    const cx = x + w/2;
    const cy = y + h/2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.ellipse(cx, y + h + 4, w/2, 3, 0, 0, Math.PI*2);
    ctx.fill();

    // Body Color
    const bodyColor = '#065f46'; // Teal 800

    // Tail Boom
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(x + 12, cy);
    ctx.lineTo(x + w, cy - 2);
    ctx.lineTo(x + w, cy + 2);
    ctx.lineTo(x + 12, cy + 6);
    ctx.fill();

    // Cabin Bubble
    ctx.fillStyle = '#047857'; // Teal 700
    ctx.beginPath();
    ctx.arc(x + 14, cy + 2, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Cockpit Glass
    ctx.fillStyle = '#67e8f9'; // Cyan 300
    ctx.beginPath();
    ctx.moveTo(x + 14, cy + 2);
    ctx.arc(x + 14, cy + 2, 8, Math.PI * 0.7, Math.PI * 1.5);
    ctx.fill();

    // Skids
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, cy + 12);
    ctx.lineTo(x + 20, cy + 12);
    ctx.moveTo(x + 10, cy + 10);
    ctx.lineTo(x + 10, cy + 12);
    ctx.moveTo(x + 18, cy + 10);
    ctx.lineTo(x + 18, cy + 12);
    ctx.stroke();
    
    // Main Rotor (Spinning on top)
    ctx.fillStyle = '#111';
    const time = Date.now();
    if (Math.floor(time / 40) % 2 === 0) {
        ctx.fillRect(x - 2, y - 2, w + 4, 2); // Wide
    } else {
        ctx.fillRect(x + 8, y - 2, w - 16, 2); // Narrow
    }
    ctx.fillRect(x + 13, y, 2, 4); // Mast

    // Tail Rotor
    if (Math.floor(time / 20) % 2 === 0) {
       ctx.fillRect(x + w - 2, cy - 5, 2, 10);
    } else {
       ctx.fillRect(x + w - 5, cy - 1, 8, 2);
    }
};

const drawJetSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, speedX: number = 0) => {
    // Side-ish view for crossing jets
    const facingRight = speedX >= 0;
    
    ctx.save();
    // Flip if moving left
    if (!facingRight) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.translate(-x, -y);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 20);
    ctx.lineTo(x + w, y + 20);
    ctx.lineTo(x + 15, y + 26);
    ctx.fill();

    // Main Body
    ctx.fillStyle = '#b91c1c'; // Red 700
    ctx.beginPath();
    ctx.moveTo(x + w, y + 10); // Nose tip
    ctx.lineTo(x, y + 6); // Tail top
    ctx.lineTo(x + 4, y + 14); // Tail bottom
    ctx.lineTo(x + w - 4, y + 14); // Under nose
    ctx.fill();

    // Delta Wing (Perspective)
    ctx.fillStyle = '#7f1d1d'; // Red 900
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 10);
    ctx.lineTo(x + 8, y + 24); // Wing tip
    ctx.lineTo(x + 28, y + 10);
    ctx.fill();

    // Vertical Stabilizer
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 8);
    ctx.lineTo(x + 8, y - 2);
    ctx.lineTo(x + 14, y + 8);
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#f59e0b'; // Amber
    ctx.fillRect(x + 22, y + 6, 6, 4);

    ctx.restore();
};

const drawFuelSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Base canister
    ctx.fillStyle = '#be123c'; // Rose 700
    ctx.fillRect(x, y, w, h);
    
    // Shading
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    
    // 3D effect side
    ctx.fillStyle = '#881337';
    ctx.fillRect(x + w - 4, y + 2, 2, h - 4);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("FUEL", x + w/2, y + h/2);
    
    // Top cap
    ctx.fillStyle = '#881337';
    ctx.fillRect(x + w/2 - 6, y - 4, 12, 4);
};

const drawBridge = (ctx: CanvasRenderingContext2D, y: number) => {
    // Road Deck
    ctx.fillStyle = '#374151'; // Gray 700
    ctx.fillRect(0, y, CANVAS_WIDTH, 24);
    
    // Side Rails
    ctx.fillStyle = '#1f2937'; // Gray 800
    ctx.fillRect(0, y - 2, CANVAS_WIDTH, 4);
    ctx.fillRect(0, y + 22, CANVAS_WIDTH, 4);

    // Yellow Lane Markers
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    for(let i=0; i<CANVAS_WIDTH; i+=40) {
        ctx.fillRect(i, y + 11, 20, 2);
    }
    
    // Bridge Supports (Pillars) in water
    ctx.fillStyle = '#111827';
    ctx.fillRect(CANVAS_WIDTH/4 - 10, y + 24, 20, 15);
    ctx.fillRect(CANVAS_WIDTH*0.75 - 10, y + 24, 20, 15);
};

const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Pine tree style - Darker for contrast
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 8, 3, 0, 0, Math.PI*2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#451a03'; // Dark Brown
    ctx.fillRect(x - 2, y - 2, 4, 6);

    // Leaves layers (Dark Green)
    ctx.fillStyle = '#14532d'; // Green 900
    
    // Bottom layer
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 10, y + 2);
    ctx.lineTo(x - 10, y + 2);
    ctx.fill();

    // Middle layer
    ctx.fillStyle = '#166534'; // Green 800
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 8, y - 4);
    ctx.lineTo(x - 8, y - 4);
    ctx.fill();

    // Top layer
    ctx.fillStyle = '#15803d'; // Green 700
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 6, y - 10);
    ctx.lineTo(x - 6, y - 10);
    ctx.fill();
};

const drawHouse = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Cottage
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(x, y, 14, 10);
    
    // Roof
    ctx.fillStyle = '#991b1b'; // Red roof
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 7, y - 8);
    ctx.lineTo(x + 16, y);
    ctx.fill();
    
    // Door
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 5, y + 4, 4, 6);
    
    // Window
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(x + 2, y + 2, 3, 3);
};


const RiverRaidGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  
  // Game State Refs
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

  // React State for UI Overlay
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
    
    const initialRiver: RiverSlice[] = [];
    let currentSlice: RiverSlice = { y: CANVAS_HEIGHT, leftBank: 100, rightBank: CANVAS_WIDTH - 100, island: null, decorations: [] };
    
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
    entitiesRef.current = entitiesRef.current.filter(e => e.y < playerRef.current.y - 300);
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
    if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('w')) {
      player.vy = Math.min(player.vy + 0.05, 6);
    } else if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('s')) {
      player.vy = Math.max(player.vy - 0.1, 0.5);
    } else {
      if (player.vy > INITIAL_SCROLL_SPEED) player.vy -= 0.02;
      if (player.vy < INITIAL_SCROLL_SPEED) player.vy += 0.02;
    }
    
    // Shoot
    if (keysPressed.current.has(' ') || keysPressed.current.has('Enter')) {
      const now = Date.now();
      if (now - lastShotTime.current > 250) {
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
    
    for (const slice of riverRef.current) {
      slice.y += speed;
    }
    riverRef.current = riverRef.current.filter(slice => slice.y < CANVAS_HEIGHT + 100);
    
    if (riverRef.current.length > 0) {
      while (riverRef.current[riverRef.current.length - 1].y > -50) {
        const lastSlice = riverRef.current[riverRef.current.length - 1];
        const newSlice = generateRiverSlice(lastSlice, 0, levelRef.current);
        newSlice.y = lastSlice.y - 1; 
        riverRef.current.push(newSlice);
        
        // Spawn Logic
        if (Math.abs(distanceTraveledRef.current % BRIDGE_INTERVAL) < speed) {
          entitiesRef.current.push({
              id: Math.random().toString(),
              type: EnemyType.BRIDGE,
              x: 0,
              y: newSlice.y,
              width: CANVAS_WIDTH,
              height: 24,
              markedForDeletion: false
          });
        } else if (Math.random() < 0.03) {
          const isFuel = Math.random() < 0.25;
          const type = isFuel ? EnemyType.FUEL_DEPOT : 
                      (Math.random() < 0.5 ? EnemyType.SHIP : (Math.random() < 0.5 ? EnemyType.HELICOPTER : EnemyType.JET));
          
          const margin = 20;
          const safeMin = newSlice.leftBank + margin;
          const safeMax = newSlice.rightBank - margin;
          
          if (safeMax > safeMin) {
            const spawnX = safeMin + Math.random() * (safeMax - safeMin);
            // Assign horizontal speed for moving enemies
            let sx = 0;
            if (type === EnemyType.JET) sx = Math.random() > 0.5 ? 2.5 : -2.5;
            if (type === EnemyType.SHIP || type === EnemyType.HELICOPTER) sx = 0; // Ships/Helis mostly static in River Raid, or slow patrol

            entitiesRef.current.push({
              id: Math.random().toString(),
              type,
              x: spawnX,
              y: newSlice.y,
              width: isFuel ? 30 : 40,
              height: isFuel ? 50 : 30,
              markedForDeletion: false,
              speedX: sx
            });
          }
        }
      }
    }

    // --- 3. Entity Updates ---
    entitiesRef.current.forEach(e => {
      e.y += speed;
      
      if (e.speedX) {
        e.x += e.speedX;
        if (e.x < 0 || e.x > CANVAS_WIDTH) e.speedX *= -1;
      }
      
      if (e.y > CANVAS_HEIGHT + 50) e.markedForDeletion = true;
    });
    
    bulletsRef.current.forEach(b => {
      b.y += b.vy;
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
    const playerFeetY = player.y + PLAYER_HEIGHT;
    const playerHeadY = player.y;
    
    const intersectingSlices = riverRef.current.filter(s => s.y >= playerHeadY && s.y <= playerFeetY);
    
    let touchingLand = false;
    for (const slice of intersectingSlices) {
      if (player.x < slice.leftBank || (player.x + PLAYER_WIDTH) > slice.rightBank) {
        touchingLand = true;
      }
      if (slice.island) {
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

    // B. Player vs Entities
    const playerBox = { x: player.x + 4, y: player.y + 4, width: PLAYER_WIDTH - 8, height: PLAYER_HEIGHT - 8 };
    
    entitiesRef.current.forEach(e => {
      const entityBox = { x: e.x, y: e.y, width: e.width, height: e.height };
      
      if (checkCollision(playerBox, entityBox)) {
        if (e.type === EnemyType.FUEL_DEPOT) {
          player.fuel = Math.min(player.fuel + FUEL_REFILL_RATE * 5, MAX_FUEL);
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
             levelRef.current++;
             particlesRef.current.push(...createExplosion(e.x + CANVAS_WIDTH/2, e.y, '#fbbf24'));
          } else {
             e.markedForDeletion = true;
             player.score += (e.type === EnemyType.FUEL_DEPOT ? 80 : 100);
             particlesRef.current.push(...createExplosion(e.x + e.width/2, e.y + e.height/2, e.type === EnemyType.FUEL_DEPOT ? '#f43f5e' : '#fbbf24'));
          }
        }
      });
      
      if (hit) {
         b.y = -999; 
      }
    });
    
    entitiesRef.current = entitiesRef.current.filter(e => !e.markedForDeletion);
    bulletsRef.current = bulletsRef.current.filter(b => b.y > -1000);

    // --- 5. Fuel Management ---
    player.fuel -= FUEL_CONSUMPTION_RATE * (speed > 1 ? speed / 2 : 0.5);
    if (player.fuel <= 0) {
      handleDeath("Out of fuel!");
    }

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
    particlesRef.current.push(...createExplosion(playerRef.current.x + PLAYER_WIDTH/2, playerRef.current.y + PLAYER_HEIGHT/2, '#ef4444'));
    
    playerRef.current.lives -= 1;
    if (playerRef.current.lives <= 0) {
      gameStateRef.current = GameState.GAME_OVER;
      setUiState(prev => ({ ...prev, lives: 0, state: GameState.GAME_OVER }));
    } else {
      resetAfterDeath();
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!riverRef.current || riverRef.current.length < 2) return;

    // Clear background (Land color)
    ctx.fillStyle = COLOR_LAND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 0. Draw Land Textures (Trees, Houses) from Slices
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
    
    if (riverRef.current[0]) {
      ctx.moveTo(riverRef.current[0].leftBank, riverRef.current[0].y);
      for (const slice of riverRef.current) {
          ctx.lineTo(slice.leftBank, slice.y);
      }
      const topSlice = riverRef.current[riverRef.current.length-1];
      ctx.lineTo(topSlice.rightBank, topSlice.y);
      
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
              if (slice.decorations) {
                 for (const d of slice.decorations) {
                    if (d.x > slice.island.left && d.x < slice.island.right) {
                       drawTree(ctx, d.x, slice.y);
                    }
                 }
              }
          }
      }
      
      // Draw Border details
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
         // Pass speedX to determine facing direction
         drawJetSprite(ctx, e.x, e.y, e.width, e.height, e.speedX);
      }
    });

    // 3. Draw Player
    if (gameStateRef.current === GameState.PLAYING) {
        drawPlayerSprite(ctx, playerRef.current.x, playerRef.current.y);
    }

    // 4. Draw Bullets
    ctx.fillStyle = '#fef08a';
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
    const initialRiver: RiverSlice[] = [];
    let currentSlice: RiverSlice = { y: CANVAS_HEIGHT, leftBank: 100, rightBank: CANVAS_WIDTH - 100, island: null, decorations: [] };
    
    for (let i = 0; i < CANVAS_HEIGHT + 200; i++) {
      currentSlice = generateRiverSlice(currentSlice, 0, 1);
      initialRiver.push(currentSlice);
    }
    riverRef.current = initialRiver;

    animationFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [loop]);

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
        className="border-4 border-gray-800 shadow-2xl bg-[#84cc16] rounded-sm max-h-[95vh] w-auto aspect-[3/4]"
      />
      
    </div>
  );
};

export default RiverRaidGame;