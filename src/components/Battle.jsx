import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const MAX_HP = 100;
const ACTIONS = {
  ATTACK: "attack",
  HEAL: "heal",
  SHIELD: "shield",
};

const LEVEL_THRESHOLDS = [0, 3, 6, 10, 15, 21, 28];

const SKILL_STATS = {
  attack: { baseDmg: [18, 24], mpCost: 15, label: "Attack", icon: "⚔️" },
  heal: { baseHeal: [12, 18], mpCost: 20, label: "Heal", icon: "💚" },
  shield: { duration: 1, mpCost: 10, label: "Shield", icon: "🛡️" },
};

const MESSAGES = {
  attack: (name, dmg, blocked) =>
    blocked
      ? `${name}'s attack was blocked by shield!`
      : `${name} strikes for ${dmg} damage!`,
  heal: (name, amt) => `${name} recovers ${amt} HP!`,
  shield: (name) => `${name} raises a shield! (blocks next hit)`,
  win: (name) => `⚔️ ${name} wins the battle!`,
  draw: () => "Both warriors fall! It's a draw!",
};

// ─── SOUND ENGINE ────────────────────────────────────────────────────────────
function createSound(freq, type, duration, gain = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.5,
      ctx.currentTime + duration,
    );
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

const SFX = {
  attack: () => createSound(220, "sawtooth", 0.2, 0.4),
  hit: () => createSound(110, "square", 0.15, 0.3),
  heal: () => createSound(523, "sine", 0.3, 0.25),
  shield: () => createSound(660, "triangle", 0.25, 0.2),
  block: () => createSound(330, "square", 0.1, 0.2),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => createSound(f, "sine", 0.4, 0.35), i * 150),
    );
  },
  level: () => {
    [659, 784, 1047].forEach((f, i) =>
      setTimeout(() => createSound(f, "triangle", 0.3, 0.3), i * 120),
    );
  },
};

// ─── GAME REDUCER ────────────────────────────────────────────────────────────
function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initPlayer(name, color) {
  return {
    name,
    color,
    hp: MAX_HP,
    mp: 60,
    maxMp: 60,
    shield: false,
    wins: 0,
    xp: 0,
    level: 1,
    combo: 0,
  };
}

function initState() {
  return {
    p1: initPlayer("Player 1", "#e55"),
    p2: initPlayer("Player 2", "#55e"),
    turn: 0,
    phase: "playing",
    log: ["⚔️ Battle begins! Player 1 goes first."],
    roundNum: 1,
    animations: { p1: null, p2: null },
  };
}

function calcLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function gameReducer(state, action) {
  if (state.phase !== "playing" && action.type !== "RESET") return state;

  if (action.type === "RESET") return initState();

  const { skill } = action;
  const actorKey = state.turn === 0 ? "p1" : "p2";
  const targetKey = state.turn === 0 ? "p2" : "p1";
  const actor = { ...state[actorKey] };
  const target = { ...state[targetKey] };
  const cost = SKILL_STATS[skill].mpCost;
  let msg = "";
  let actAnim = null,
    tgtAnim = null;

  if (actor.mp < cost) {
    return {
      ...state,
      log: [`⚡ ${actor.name} has no MP! (needs ${cost})`, ...state.log].slice(
        0,
        15,
      ),
    };
  }

  actor.mp = Math.max(0, actor.mp - cost);

  if (skill === ACTIONS.ATTACK) {
    const lvlBonus = (actor.level - 1) * 2;
    const dmg =
      rng(SKILL_STATS.attack.baseDmg[0], SKILL_STATS.attack.baseDmg[1]) +
      lvlBonus;
    SFX.attack();
    if (target.shield) {
      SFX.block();
      target.shield = false;
      actor.combo = 0;
      msg = MESSAGES.attack(actor.name, dmg, true);
      tgtAnim = "block";
    } else {
      setTimeout(SFX.hit, 100);
      target.hp = Math.max(0, target.hp - dmg);
      actor.xp = actor.xp + 1;
      actor.combo = (actor.combo || 0) + 1;
      if (actor.combo >= 3)
        msg = `🔥 COMBO x${actor.combo}! ${actor.name} hits for ${dmg + actor.combo * 3} damage!`;
      else msg = MESSAGES.attack(actor.name, dmg, false);
      actAnim = "attack";
      tgtAnim = "hit";
    }
  } else if (skill === ACTIONS.HEAL) {
    const healAmt = rng(
      SKILL_STATS.heal.baseHeal[0],
      SKILL_STATS.heal.baseHeal[1],
    );
    actor.hp = Math.min(MAX_HP, actor.hp + healAmt);
    actor.combo = 0;
    SFX.heal();
    msg = MESSAGES.heal(actor.name, healAmt);
    actAnim = "heal";
  } else if (skill === ACTIONS.SHIELD) {
    actor.shield = true;
    actor.combo = 0;
    SFX.shield();
    msg = MESSAGES.shield(actor.name);
    actAnim = "shield";
  }

  // MP regen every turn
  actor.mp = Math.min(actor.maxMp, actor.mp + 8);
  target.mp = Math.min(target.maxMp, target.mp + 5);

  // Level up
  const newLevel = calcLevel(actor.xp);
  if (newLevel > actor.level) {
    actor.level = newLevel;
    actor.maxMp = 60 + (newLevel - 1) * 10;
    actor.mp = actor.maxMp;
    setTimeout(SFX.level, 200);
    msg += ` | 🌟 ${actor.name} reached Level ${newLevel}!`;
  }

  let phase = "playing";
  let winner = null;

  if (target.hp <= 0 && actor.hp <= 0) {
    phase = "over";
    msg = MESSAGES.draw();
  } else if (target.hp <= 0) {
    phase = "over";
    winner = actor.name;
    actor.wins++;
    msg = MESSAGES.win(actor.name);
    setTimeout(SFX.win, 100);
  }

  return {
    ...state,
    [actorKey]: actor,
    [targetKey]: target,
    turn: state.turn === 0 ? 1 : 0,
    phase,
    winner,
    roundNum: state.roundNum + 1,
    log: [msg, ...state.log].slice(0, 15),
    animations: { [actorKey]: actAnim, [targetKey]: tgtAnim },
  };
}

// ─── HP BAR ──────────────────────────────────────────────────────────────────
function HPBar({ hp, color }) {
  const pct = Math.max(0, (hp / MAX_HP) * 100);
  const barColor = pct > 50 ? "#4caf50" : pct > 25 ? "#ff9800" : "#f44336";
  return (
    <div
      style={{
        background: "#1a1a2e",
        borderRadius: 8,
        height: 12,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: barColor,
          transition: "width 0.4s ease, background 0.3s",
          borderRadius: 8,
          boxShadow: `0 0 8px ${barColor}88`,
        }}
      />
    </div>
  );
}

function MPBar({ mp, maxMp }) {
  const pct = Math.max(0, (mp / maxMp) * 100);
  return (
    <div
      style={{
        background: "#1a1a2e",
        borderRadius: 6,
        height: 8,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "#3b82f6",
          transition: "width 0.4s ease",
          borderRadius: 6,
          boxShadow: "0 0 6px #3b82f688",
        }}
      />
    </div>
  );
}

// ─── WARRIOR CARD ─────────────────────────────────────────────────────────────
const SPRITES = {
  "Player 1": ["  ⚔️  ", " 🧙 ", "  ⚡  "],
  "Player 2": ["  🗡️  ", " 🧝 ", "  💥  "],
};

function WarriorCard({ player, isActive, anim, isLeft }) {
  const [shake, setShake] = useState(false);
  const [glow, setGlow] = useState(false);
  const [healPop, setHealPop] = useState(false);
  const [shieldFlash, setShieldFlash] = useState(false);
  const frameRef = useRef(0);
  const [spriteFrame, setSpriteFrame] = useState(0);

  useEffect(() => {
    if (anim === "hit") {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    if (anim === "attack") {
      setGlow(true);
      setTimeout(() => setGlow(false), 600);
    }
    if (anim === "heal") {
      setHealPop(true);
      setTimeout(() => setHealPop(false), 700);
    }
    if (anim === "block" || anim === "shield") {
      setShieldFlash(true);
      setTimeout(() => setShieldFlash(false), 600);
    }
  }, [anim]);

  // Idle sprite animation
  useEffect(() => {
    if (player.hp <= 0) return;
    const t = setInterval(
      () => {
        setSpriteFrame((f) => (f + 1) % 3);
      },
      isActive ? 400 : 800,
    );
    return () => clearInterval(t);
  }, [isActive, player.hp]);

  const xpForNext =
    LEVEL_THRESHOLDS[Math.min(player.level, LEVEL_THRESHOLDS.length - 1)];
  const xpCur = LEVEL_THRESHOLDS[player.level - 1];
  const xpPct =
    xpForNext > xpCur ? ((player.xp - xpCur) / (xpForNext - xpCur)) * 100 : 100;

  return (
    <div
      style={{
        flex: 1,
        background: isActive ? "#0f0f23" : "#09091a",
        border: `2px solid ${isActive ? player.color : "#2a2a4a"}`,
        borderRadius: 16,
        padding: "18px 16px",
        transition: "border-color 0.3s, transform 0.1s",
        transform: shake
          ? isLeft
            ? "translateX(-8px) rotate(-2deg)"
            : "translateX(8px) rotate(2deg)"
          : "none",
        boxShadow: isActive ? `0 0 24px ${player.color}44` : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Active glow overlay */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background: `radial-gradient(ellipse at ${isLeft ? "30%" : "70%"} 20%, ${player.color}11 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Shield flash */}
      {shieldFlash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background: "rgba(100,180,255,0.2)",
            animation: "none",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Heal pop */}
      {healPop && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#4caf50",
            fontWeight: 900,
            fontSize: 22,
            pointerEvents: "none",
            animation: "floatUp 0.7s ease-out forwards",
            zIndex: 10,
          }}
        >
          +HP
        </div>
      )}

      {/* Attack glow */}
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background: `radial-gradient(circle, ${player.color}33 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 15,
            color: player.color,
            letterSpacing: "0.04em",
          }}
        >
          {player.name}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {player.shield && (
            <span style={{ fontSize: 14 }} title="Shield active">
              🛡
            </span>
          )}
          <span
            style={{
              background: "#1a1a3a",
              color: "#f0c040",
              borderRadius: 8,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Lv{player.level}
          </span>
          {player.wins > 0 && (
            <span style={{ fontSize: 12, color: "#ffd700" }}>
              {"⭐".repeat(Math.min(player.wins, 3))}
            </span>
          )}
        </div>
      </div>

      {/* Sprite */}
      <div
        style={{
          textAlign: "center",
          fontSize: player.hp <= 0 ? 40 : 36,
          margin: "8px 0",
          filter: player.hp <= 0 ? "grayscale(1) opacity(0.4)" : "none",
          transition: "filter 0.5s",
        }}
      >
        {player.hp <= 0 ? "💀" : SPRITES[player.name][spriteFrame]}
      </div>

      {/* HP */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 11, color: "#888" }}>HP</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color:
                player.hp > 50
                  ? "#4caf50"
                  : player.hp > 25
                    ? "#ff9800"
                    : "#f44336",
            }}
          >
            {player.hp}/{MAX_HP}
          </span>
        </div>
        <HPBar hp={player.hp} color={player.color} />
      </div>

      {/* MP */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 3,
          }}
        >
          <span style={{ fontSize: 11, color: "#888" }}>MP</span>
          <span style={{ fontSize: 11, color: "#3b82f6" }}>
            {player.mp}/{player.maxMp}
          </span>
        </div>
        <MPBar mp={player.mp} maxMp={player.maxMp} />
      </div>

      {/* XP bar */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 3,
          }}
        >
          <span style={{ fontSize: 10, color: "#555" }}>XP</span>
          <span style={{ fontSize: 10, color: "#f0c040" }}>{player.xp}</span>
        </div>
        <div
          style={{
            background: "#1a1a2e",
            borderRadius: 4,
            height: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${xpPct}%`,
              height: "100%",
              background: "#f0c040",
              borderRadius: 4,
              transition: "width 0.4s",
            }}
          />
        </div>
      </div>

      {/* Combo badge */}
      {player.combo >= 2 && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            background: "#f44336",
            color: "#fff",
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          🔥{player.combo}x
        </div>
      )}
    </div>
  );
}

// ─── ACTION BUTTONS ───────────────────────────────────────────────────────────
function ActionButtons({ onAction, disabled, actor }) {
  const skills = [
    {
      key: "attack",
      label: "Attack",
      icon: "⚔️",
      color: "#e55",
      desc: `${SKILL_STATS.attack.baseDmg[0]}-${SKILL_STATS.attack.baseDmg[1]} DMG`,
    },
    {
      key: "heal",
      label: "Heal",
      icon: "💚",
      color: "#4c9",
      desc: `${SKILL_STATS.heal.baseHeal[0]}-${SKILL_STATS.heal.baseHeal[1]} HP`,
    },
    {
      key: "shield",
      label: "Shield",
      icon: "🛡️",
      color: "#48f",
      desc: "Block 1 hit",
    },
  ];

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {skills.map((s) => {
        const noMp = actor && actor.mp < SKILL_STATS[s.key].mpCost;
        return (
          <button
            key={s.key}
            disabled={disabled || noMp}
            onClick={() => onAction(s.key)}
            title={`${s.desc} | Cost: ${SKILL_STATS[s.key].mpCost} MP`}
            style={{
              flex: 1,
              padding: "12px 6px",
              borderRadius: 12,
              border: `2px solid ${disabled || noMp ? "#2a2a3a" : s.color}`,
              background: disabled || noMp ? "#0f0f1e" : `${s.color}22`,
              color: disabled || noMp ? "#444" : s.color,
              cursor: disabled || noMp ? "not-allowed" : "pointer",
              fontSize: 22,
              fontWeight: 700,
              transition: "all 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
            onMouseEnter={(e) => {
              if (!disabled && !noMp) e.target.style.transform = "scale(1.07)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: 26 }}>{s.icon}</span>
            <span style={{ fontSize: 12, letterSpacing: "0.04em" }}>
              {s.label}
            </span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>
              {SKILL_STATS[s.key].mpCost}MP
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── BATTLE LOG ───────────────────────────────────────────────────────────────
function BattleLog({ log }) {
  return (
    <div
      style={{
        background: "#07071a",
        border: "1px solid #1e1e3e",
        borderRadius: 12,
        padding: "10px 14px",
        maxHeight: 150,
        overflowY: "auto",
      }}
    >
      {log.map((entry, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            color: i === 0 ? "#e0e0ff" : "#555",
            padding: "2px 0",
            fontFamily: "monospace",
            borderBottom: i === 0 ? "1px solid #1e1e3e" : "none",
            paddingBottom: i === 0 ? 6 : 0,
            fontWeight: i === 0 ? 600 : 400,
          }}
        >
          {entry}
        </div>
      ))}
    </div>
  );
}

// ─── VICTORY SCREEN ──────────────────────────────────────────────────────────
function VictoryScreen({ winner, onRematch, p1wins, p2wins }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 20,
        background: "rgba(5,5,20,0.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        gap: 16,
      }}
    >
      <div style={{ fontSize: 60 }}>{winner ? "🏆" : "💀"}</div>
      <div
        style={{
          fontFamily: "'Syne',sans-serif",
          fontSize: 28,
          fontWeight: 800,
          color: "#f0c040",
          textAlign: "center",
        }}
      >
        {winner ? `${winner} Wins!` : "Draw!"}
      </div>
      <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#aaa" }}>
        <span>P1: {p1wins} ⭐</span>
        <span>P2: {p2wins} ⭐</span>
      </div>
      <button
        onClick={onRematch}
        style={{
          padding: "12px 36px",
          borderRadius: 12,
          border: "2px solid #f0c040",
          background: "#f0c04022",
          color: "#f0c040",
          fontWeight: 800,
          fontSize: 16,
          cursor: "pointer",
          letterSpacing: "0.05em",
        }}
      >
        ⚔️ Rematch!
      </button>
    </div>
  );
}

// ─── MAIN GAME ────────────────────────────────────────────────────────────────
export default function Battle() {
  const [state, dispatch] = useReducer(gameReducer, null, initState);
  const [prevAnims, setPrevAnims] = useState({ p1: null, p2: null });
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(true);
  const timerRef = useRef(null);
  const [p1wins, setP1wins] = useState(0);
  const [p2wins, setP2wins] = useState(0);

  // Track wins across resets
  useEffect(() => {
    if (state.phase === "over" && state.winner) {
      if (state.winner === "Player 1") setP1wins((w) => w + 1);
      if (state.winner === "Player 2") setP2wins((w) => w + 1);
    }
  }, [state.phase, state.winner]);

  // Timer
  useEffect(() => {
    if (state.phase !== "playing") {
      clearInterval(timerRef.current);
      return;
    }
    setTimerActive(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          // Auto-attack on timeout
          dispatch({ type: "ACTION", skill: "attack" });
          return 30;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state.turn, state.phase]);

  // Reset timer on action
  const handleAction = useCallback(
    (skill) => {
      dispatch({ type: "ACTION", skill });
      setPrevAnims(state.animations);
      setTimer(30);
    },
    [state.animations],
  );

  const handleReset = () => {
    dispatch({ type: "RESET" });
    setTimer(30);
  };

  const currentActor = state.turn === 0 ? state.p1 : state.p2;
  const turnColor = state.turn === 0 ? state.p1.color : state.p2.color;

  // Google Fonts
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono&display=swap";
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#04040f",
        color: "#e0e0ff",
        fontFamily: "'DM Mono', monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @keyframes floatUp {
          0% { opacity:1; transform:translateX(-50%) translateY(0); }
          100% { opacity:0; transform:translateX(-50%) translateY(-40px); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 30,
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #e55, #f0c040, #55e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ⚔️ Frontend Battle
        </h1>
        <p style={{ fontSize: 12, color: "#444", margin: "4px 0 0" }}>
          Round {state.roundNum} · P1 Wins: {p1wins} · P2 Wins: {p2wins}
        </p>
      </div>

      {/* Main arena */}
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "#07071a",
          border: "1px solid #1e1e3e",
          borderRadius: 20,
          padding: "20px",
          position: "relative",
        }}
      >
        {/* Turn indicator + timer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              background: `${turnColor}22`,
              border: `1px solid ${turnColor}`,
              fontSize: 12,
              color: turnColor,
              fontWeight: 700,
              animation:
                state.phase === "playing"
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
            }}
          >
            {state.phase === "playing"
              ? `${currentActor.name}'s Turn`
              : "Battle Over"}
          </div>

          {/* Timer */}
          {state.phase === "playing" && (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: `3px solid ${timer <= 10 ? "#f44" : "#2a2a4a"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: timer <= 10 ? "#f44" : "#888",
                background: "#0a0a1e",
                transition: "border-color 0.3s, color 0.3s",
              }}
            >
              {timer}
            </div>
          )}
        </div>

        {/* Warriors */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <WarriorCard
            player={state.p1}
            isActive={state.turn === 0 && state.phase === "playing"}
            anim={state.animations.p1}
            isLeft={true}
          />

          {/* VS divider */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: "#333" }}>
              VS
            </div>
            <div style={{ width: 1, flex: 1, background: "#1e1e3e" }} />
          </div>

          <WarriorCard
            player={state.p2}
            isActive={state.turn === 1 && state.phase === "playing"}
            anim={state.animations.p2}
            isLeft={false}
          />
        </div>

        {/* Action buttons */}
        {state.phase === "playing" && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: "#444",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {currentActor.name} — choose your action
            </div>
            <ActionButtons
              onAction={handleAction}
              disabled={false}
              actor={currentActor}
            />
          </div>
        )}

        {/* Battle Log */}
        <BattleLog log={state.log} />

        {/* Restart button */}
        <button
          onClick={handleReset}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "9px",
            borderRadius: 10,
            border: "1px solid #1e1e3e",
            background: "transparent",
            color: "#555",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          ↺ New Game
        </button>

        {/* Victory overlay */}
        {state.phase === "over" && (
          <VictoryScreen
            winner={state.winner}
            onRematch={handleReset}
            p1wins={p1wins}
            p2wins={p2wins}
          />
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "#333",
        }}
      >
        <span>⚔️ Attack — deals damage</span>
        <span>💚 Heal — restore HP</span>
        <span>🛡️ Shield — block next hit</span>
      </div>
    </div>
  );
}
