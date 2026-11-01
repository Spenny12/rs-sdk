# Walking & Navigation

Successful patterns for movement and pathfinding.

## Basic Walking

`bot.walkTo()` performs pathfinding for both short and long routes:

```typescript
const result = await bot.walkTo(3222, 3218);  // Walk to Lumbridge
if (!result.success) console.warn(result.reason, result.message);
```

## Long Distance Walking

`walkTo()` supports long routes. Use waypoints when you intentionally need a
safer route, want progress checkpoints, or need to avoid a dangerous area:

```typescript
const WAYPOINTS_TO_BANK = [
    { x: 3270, z: 3380 },  // Step 1
    { x: 3250, z: 3395 },  // Step 2
    { x: 3230, z: 3410 },  // Step 3
    { x: 3210, z: 3425 },  // Step 4
    { x: 3185, z: 3436 },  // Final destination
];

async function walkWaypoints(waypoints) {
    for (const wp of waypoints) {
        // Try up to 3 times per waypoint
        for (let attempt = 0; attempt < 3; attempt++) {
            await bot.walkTo(wp.x, wp.z);
            await new Promise(r => setTimeout(r, 500));

            const player = sdk.getState()?.player;
            const dist = Math.sqrt(
                Math.pow(player.worldX - wp.x, 2) +
                Math.pow(player.worldZ - wp.z, 2)
            );

            if (dist <= 5) break;  // Close enough
        }
    }
}
```

## Verifying Arrival

Always check if you actually arrived:

```typescript
const result = await bot.walkTo(targetX, targetZ);

const player = sdk.getState()?.player;
const dist = Math.sqrt(
    Math.pow(player.worldX - targetX, 2) +
    Math.pow(player.worldZ - targetZ, 2)
);

if (dist > 5) {
    console.warn(`Walk failed: still ${dist.toFixed(0)} tiles away`);
}
```

## Known Routes

### Varrock Mine to Varrock West Bank (~100 tiles)

```typescript
const MINE_TO_BANK = [
    { x: 3270, z: 3380 },
    { x: 3250, z: 3395 },
    { x: 3230, z: 3410 },
    { x: 3210, z: 3425 },
    { x: 3185, z: 3436 },
];

const BANK_TO_MINE = [
    { x: 3210, z: 3425 },
    { x: 3230, z: 3410 },
    { x: 3250, z: 3395 },
    { x: 3270, z: 3380 },
    { x: 3285, z: 3365 },
];
```

## Opening Obstacles

`bot.walkTo()` attempts to open doors and gates on its route. If a route fails,
inspect nearby objects and open the specific obstacle before retrying:

```typescript
let result = await bot.walkTo(3250, 3260);
if (!result.success) {
    const gate = sdk.findNearbyLoc(/^gate$/i);
    if (gate?.optionsWithIndex.some(option => /^open$/i.test(option.text))) {
        await bot.openDoor(gate);
        result = await bot.walkTo(3250, 3260);
    }
}
```





## Cow Field to Draynor Bank

Draynor Bank (3092, 3243) is the closest bank to Lumbridge cow field.

### DANGER: Dark Wizards
**AVOID** the area around (3220, 3220) - aggressive Dark Wizards here will attack and likely kill characters under combat level 20.

### Safe Route Strategy
Stay **north of z=3240** when walking west from cow field to Draynor. Use `walkTo` with intermediate points that curve north around the danger zone rather than walking in a straight line.

```typescript
// Safe: curve north around Dark Wizards
await bot.walkTo(3230, 3270);  // Go west, stay north
await bot.walkTo(3150, 3250);  // Continue west
await bot.walkTo(3092, 3243);  // Draynor Bank

// DANGEROUS: straight line cuts through wizard area!
await bot.walkTo(3092, 3243);  // May path through (3220, 3220)
```

## Key Coordinates

| Location | Coordinates |
|----------|-------------|
| Lumbridge spawn | (3222, 3218) |
| Lumbridge cows (field center) | (3253, 3290) |
| Cow field south gate | (3253, 3266) |
| Draynor fishing | (3087, 3230) |
| Varrock West bank | (3185, 3436) |
| SE Varrock mine | (3285, 3365) |
| Lumbridge general store | (3212, 3247) |
| Lumbridge castle (thieving) | (3222, 3218) |
| Falador center | (2951, 3380) |
| Falador north gate (to Taverley and wester side of map) | ~(2935, 3460) | 
| Taverley (stone circle) | (2935, 3479) |

### Al Kharid Coordinates

| Location | Coordinates | Notes |
|----------|-------------|-------|
| Toll gate (Lumbridge side) | (3268, 3228) | Pay 10gp to enter |
| Toll gate (Al Kharid side) | (3277, 3227) | Walk here after paying |
| Al Kharid bank | (3269, 3167) | x=3269 is 1 tile west of typical "in Al Kharid" check |
| Kebab seller | (3273, 3180) | Dialog-based shop, 1gp per kebab.
| Scimitar shop (Zeke) | (3287, 3186) | Bronze to Mithril scimitars |
| Al-Kharid warriors (palace) | ~(3293, 3170) | Good thieving/combat training.
| Fishing spots | (3267, 3148) | Safe shrimp fishing (there is a lvl 14 scorpion)

### Al Kharid Detection

```typescript
// Simple check: x >= 3270 means inside Al Kharid
// BUT note the bank is at x=3269, so use x >= 3267 for safety
function isInAlKharid() {
    const player = sdk.getState()?.player;
    if (!player) return false;
    return player.worldX >= 3267 && player.worldZ < 3220;
}
```

## Walking speed (priority: movement speed)

**Measured 2026-10-31 (Spencebot, Lumbridge):** a 35-tile `walkTo` took 148 ticks
(~59 s) instead of ~18 ticks. The tick was ~400 ms, and only 33 of 166 state
updates showed movement. Run energy was 100, so running was not the limit.

**Cause:** `findPath` returns *corner* waypoints, often 1-2 tiles apart (16
waypoints for 35 tiles). `walkTo` sent one `sendWalk` per waypoint, then waited
for a full stop before the next. Each waypoint cost 2-13 idle ticks.

**Root cause 2 (bigger): gateway latency.** The hosted gateway
(`rs-sdk-demo.fly.dev`) takes 1-9 s to ack each `sendWalk`. A plain
`curl .../status/<bot>` takes 1.5-3.4 s (connect is only 24 ms). The bot reaches the
end of a short hop during that wait and stands idle. Fewer, longer commands win.

**Fix (sdk/actions.ts, `_walkToRoute`):**
- Look ahead: aim at the farthest waypoint within `walkLookahead` (40) tiles of
  path. The client routes the hop. If a hop fails to dispatch, it falls back to 12.
- Intermediate hops return 16 tiles early (8 ticks of running), so the next command
  is acked before the bot stops.
- Waypoints near a required door stay single-stepped. Door opening still runs there.
- Tests: `sdk/test/walkto-tolerance.test.ts`.
- **Result:** 35 tiles went from ~148 ticks / 53-61 s to 69 ticks / 28 s.

**Use the lite client, not the browser.** The browser client drives its action loop
from the draw loop. A hidden tab throttles it (acks of seconds, hangs of minutes).
Start `cd server/webclient && bun install && bun src/lite/runner.ts <bot>` first.
The MCP then logs "Active client detected, skipping browser launch".

**Chained walking (implemented, shared server):** like a player clicking the next
tile while still running. `walkStepToward(..., chain=true)` in `sdk/actions-helpers.ts`
sends the walk command WITHOUT awaiting its ack, then watches position. It returns
`chainLeadTiles()` tiles before the hop ends (ack EWMA / 400 ms + 8, clamped 8-22), so the
next command lands before the bot stops. The final hop and hops near doors are also
position-based but wait until within 2 tiles (no ack wait: acks took 4.5-10 s after arrival).
Hop targets stay within 30 tiles (`WALK_HOP_RADIUS`) of the bot's live position; long
straight segments are split, because far targets were rejected by the client router. A failed dispatch or 4 ticks without movement after the ack
returns `stuck`, and `_walkToRoute` falls back to 12-tile hops.
**Result on the shared server:** 58 tiles in 64 ticks / 26 s (ideal 29 ticks); the
first command still pays ~2-4 s of gateway latency. Baseline was ~148 ticks per 35 tiles.

**Hangs after "instrumenting" sdk methods (root cause found 2026-11-01):** in MCP
`execute_code`, `sdk` and `bot` are per-execution proxies. Their methods are bound to
that execution and, once it ends, they park forever (by design, so cancelled code
cannot spin). Code like `const orig = sdk.sendWalk; sdk.sendWalk = wrap; ...;
sdk.sendWalk = orig` writes the proxy's execution-bound wrapper onto the real SDK
object. Every later call from every later run then parks silently: no packet, no
`pendingActions` entry, no timeout. It looked like a dead gateway link.
`disconnect_bot` or restarting the MCP server "fixed" it only because they build a
fresh SDK object. To wrap a method: call `Object.getPrototypeOf(sdk).method` inside the
wrapper, and on exit `delete sdk.method` (see `bots/shared/travel.ts`).
An ack watchdog built on the wrong diagnosis was reverted.

**Ideas not done yet:**
- Local server (`bun bots/create-bot.ts <name> --local`): near-zero latency, but a new
  private world. The user wants the shared server, so do not move Spencebot.
- Chain non-walk actions (door opens, interactions) the same way.

**To measure walking:** record `[tick, x, z]` on each `sdk.onStateUpdate`. Count
ticks with no position change. Compare ticks used to `distance / 2`.

**Other causes of slow trips (not fixed):**
- A fight stalls `walkTo` (swamp spiders near Urhney). Retry the walk after.
- The route between the chapel and the swamp goes west of the castle. Check the
  waypoints with `sdk.sendFindPath(x, z, 500)` before long trips.
- The MCP server loads `sdk/*.ts` once. After you edit the SDK, reconnect
  `rs-agent` (`/mcp`) so the change takes effect.
