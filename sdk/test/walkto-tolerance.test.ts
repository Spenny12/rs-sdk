/**
 * walkTo must honor a caller tolerance below 2 on the final waypoint, and
 * judge tolerance in tiles (Chebyshev), not Euclidean distance.
 * Bug-report harvest 2026-09-21 (openGE/openBank/staircase "Stuck at" family).
 */
import { describe, expect, test } from 'bun:test';
import { BotSDK } from '../index';
import { BotActions } from '../actions';

function makeBot(start: { x: number; z: number }) {
    const sdk = new BotSDK({ botUsername: 'test' });
    let pos = { ...start };
    const state = () => ({
        player: { worldX: pos.x, worldZ: pos.z, x: pos.x, z: pos.z, level: 0, lifeId: 1, isDead: false },
        tick: 1, gameMessages: [], nearbyLocs: [], nearbyNpcs: [], inventory: [],
        dialog: { isOpen: false, options: [], isWaiting: false }, interface: { isOpen: false },
    });
    (sdk as any).getState = state;
    const bot = new BotActions(sdk);
    (bot as any).dismissBlockingUI = async () => {};
    const steps: number[] = [];
    const reach: number[] = []; // distance from the bot to each hop target at dispatch
    (bot as any).helpers.walkStepToward = async (tx: number, tz: number, tolerance: number) => {
        steps.push(tolerance);
        reach.push(Math.max(Math.abs(tx - pos.x), Math.abs(tz - pos.z)));
        // The stepper stops as soon as it is within its tolerance, like the real one.
        const dx = Math.sign(tx - pos.x), dz = Math.sign(tz - pos.z);
        while (Math.max(Math.abs(tx - pos.x), Math.abs(tz - pos.z)) > tolerance) pos = { x: pos.x + dx, z: pos.z + dz };
        return { status: 'arrived' as const, pos: { ...pos } };
    };
    return { sdk, bot, steps, reach, pos: () => pos };
}

describe('walkTo tolerance', () => {
    test('tolerance 0 reaches the exact tile', async () => {
        const { sdk, bot, steps, pos } = makeBot({ x: 3200, z: 3200 });
        (sdk as any).sendFindPath = async () => ({ success: true, reachedDestination: true, waypoints: [{ x: 3205, z: 3200 }, { x: 3210, z: 3200 }] });
        const r = await bot.walkTo(3210, 3200, 0);
        expect(r.success).toBe(true);
        expect(pos()).toEqual({ x: 3210, z: 3200 });
        // Waypoints 5 tiles apart merge into one lookahead hop, which is the final one.
        expect(steps).toEqual([0]);
    });

    test('long segments split into hops within reach: chained early return, exact final', async () => {
        const { sdk, bot, steps, reach, pos } = makeBot({ x: 3200, z: 3200 });
        (sdk as any).sendFindPath = async () => ({ success: true, reachedDestination: true, waypoints: [{ x: 3250, z: 3200 }, { x: 3300, z: 3200 }] });
        const r = await bot.walkTo(3300, 3200, 0);
        expect(r.success).toBe(true);
        expect(pos()).toEqual({ x: 3300, z: 3200 });
        // Every target stays within the 30-tile hop radius of the bot.
        expect(Math.max(...reach)).toBeLessThanOrEqual(30);
        // Intermediate hops return at the chain lead (16 tiles at the 3000 ms ack
        // estimate); only the final hop must land exactly.
        expect(steps.slice(0, -1).every(t => t === 16)).toBe(true);
        expect(steps[steps.length - 1]).toBe(0);
        expect(steps.length).toBeGreaterThan(2);
    });

    test('tolerance 1 accepts a diagonally adjacent tile', async () => {
        const { sdk, bot } = makeBot({ x: 3201, z: 3201 });
        (sdk as any).sendFindPath = async () => { throw new Error('should not path: already within 1 tile (diagonal)'); };
        const r = await bot.walkTo(3200, 3200, 1);
        expect(r.success).toBe(true);
        expect(r.message).toBe('Already at destination');
    });
});
