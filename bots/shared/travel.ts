// Traced walking: every real trip is also a movement benchmark. Each call appends one
// JSON line to bots/<bot>/walklog.jsonl (ticks used vs ideal, idle stretches, rejected
// hops), so later runs of the same leg can be compared without setting up test walks.
import { appendFileSync, existsSync } from 'fs';
import { join } from 'path';

/** Per-bot log: bots/<botUsername>/walklog.jsonl (falls back to bots/shared). */
const logPath = (sdk: any) => {
  const name = sdk?.config?.botUsername;
  const dir = name ? join(import.meta.dir, '..', name) : import.meta.dir;
  return join(existsSync(dir) ? dir : import.meta.dir, 'walklog.jsonl');
};

export async function walk(bot: any, sdk: any, x: number, z: number, tol = 3, label = '') {
  const calls: any[] = [];
  // `sdk` here is the MCP's per-execution proxy. Its methods are bound to THIS execution
  // and park forever once it ends. So never copy one onto the SDK object: wrap the
  // prototype method, and on exit delete the own property instead of "restoring" it.
  // (Assigning the proxy's sendWalk back made every later walk hang silently.)
  const protoWalk = Object.getPrototypeOf(sdk).sendWalk;
  sdk.sendWalk = async (wx: number, wz: number, run: boolean) => {
    const t = Date.now();
    const r = await protoWalk.call(sdk, wx, wz, run);
    calls.push({ to: [wx, wz], ms: Date.now() - t, ok: r.success });
    return r;
  };
  const trace: number[][] = [];
  const unsub = sdk.onStateUpdate((s: any) => s.player && trace.push([s.tick, s.player.worldX, s.player.worldZ]));
  const a = sdk.getState().player;
  const t0 = Date.now();
  let r: any;
  try {
    for (let i = 0; i < 3; i++) {
      r = await bot.walkTo(x, z, tol, { timeout: 150_000 });
      if (r.success) break;
    }
  } finally {
    unsub();
    delete sdk.sendWalk;
  }
  const b = sdk.getState().player;
  const idle: any[] = [];
  let st = 0;
  for (let i = 1; i <= trace.length; i++) {
    const same = i < trace.length && trace[i][1] === trace[st][1] && trace[i][2] === trace[st][2];
    if (!same) {
      if (i - st >= 3) idle.push([trace[st][1], trace[st][2], trace[i - 1][0] - trace[st][0]]);
      st = i;
    }
  }
  const dist = Math.max(Math.abs(b.worldX - a.worldX), Math.abs(b.worldZ - a.worldZ));
  const entry = {
    at: new Date().toISOString(), label, from: [a.worldX, a.worldZ], to: [b.worldX, b.worldZ],
    ok: !!r?.success, msg: r?.message, secs: Math.round((Date.now() - t0) / 100) / 10,
    ticks: trace.length ? trace[trace.length - 1][0] - trace[0][0] : 0, ideal: Math.ceil(dist / 2),
    calls: calls.length, rejected: calls.filter((c) => !c.ok).length,
    rejectedTo: calls.filter((c) => !c.ok).map((c) => c.to),
    ackAvg: calls.length ? Math.round(calls.reduce((s, c) => s + c.ms, 0) / calls.length) : 0,
    idle: idle.filter((i) => i[2] >= 4),
  };
  try { appendFileSync(logPath(sdk), JSON.stringify(entry) + '\n'); } catch {}
  return entry;
}
