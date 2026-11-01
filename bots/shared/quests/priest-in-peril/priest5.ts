// Priest in Peril essence trip 2: out of the crypt, Varrock west bank (withdraw essence),
// GE (collect water runes if filled), back to Drezel, use essence on him.
import { walk } from '../../travel';
import { sleep, startGuard } from '../../lib';

export default async ({ bot, sdk }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const ess = () => sdk.getInventory().filter((i: any) => /^rune essence$/i.test(i.name)).length;
  const guard = startGuard(bot, sdk);
  const rawGate = async (x: number, z: number, from: [number, number]) => {
    await bot.walkTo(from[0], from[1], 0, { timeout: 30_000 });
    const g = (await sdk.scanNearbyLocs(3)).find((l: any) => /gate|door/i.test(l.name) && l.x === x && l.z === z);
    if (!g) return;
    const before = [p().worldX, p().worldZ];
    await sdk.sendInteractLoc(x, z, g.id, 1);
    for (let i = 0; i < 12 && p().worldX === before[0] && p().worldZ === before[1]; i++) await sleep(400);
  };
  try {
    if (ess() === 0) {
      // Out: gate (3431, 9897) west, gate (3405, 9895) north, ladder (3405, 9906).
      if (p().worldZ > 9000 && p().worldX >= 3431) await rawGate(3431, 9897, [3432, 9897]);
      if (p().worldZ > 9000 && p().worldZ <= 9895) await rawGate(3405, 9895, [3405, 9894]);
      if (p().worldZ > 9000) {
        await bot.walkTo(3405, 9906, 1);
        const lad = (await sdk.scanNearbyLocs(5)).find((l: any) => /ladder/i.test(l.name));
        if (lad) { await bot.interactLoc(lad, /up/i); for (let i = 0; i < 25 && p().worldZ > 9000; i++) await sleep(400); }
      }
      log.push(await walk(bot, sdk, 3185, 3438, 2, 'temple->Varrock bank'));
      await bot.openBank();
      const free = 28 - sdk.getInventory().length;
      log.push((await bot.withdrawItem(/^rune essence$/i, free)).message);
      await bot.closeBank();
      // GE: collect water runes if the offer filled.
      await bot.walkTo(3182, 3442, 2);
      const table = sdk.getState().nearbyLocs.find((l: any) => /grand exchange table/i.test(l.name));
      await bot.interactLoc(table, 'Exchange');
      for (let i = 0; i < 20 && !sdk.getGEState?.(); i++) await sleep(500);
      const ge = sdk.getGEState?.();
      log.push({ offers: ge?.offers?.map((o: any) => `${o.side} ${o.item} ${o.filled ?? o.completed}/${o.quantity}`) });
      log.push((await bot.collectGE()).message);
      await bot.closeInterface();
      await sleep(800);
    }
    log.push(await walk(bot, sdk, 3405, 3506, 1, 'Varrock->temple trapdoor'));
    let td = (await sdk.scanNearbyLocs(4)).find((l: any) => /trapdoor/i.test(l.name));
    if (td?.options.some((o: string) => /^open$/i.test(o))) { await bot.interactLoc(td, 'Open'); await sleep(1500); td = (await sdk.scanNearbyLocs(4)).find((l: any) => /trapdoor/i.test(l.name)); }
    await bot.interactLoc(td, /climb.?down/i);
    for (let i = 0; i < 25 && p().worldZ < 9000; i++) await sleep(400);
    await rawGate(3405, 9895, [3405, 9896]);
    await rawGate(3431, 9897, [3430, 9897]);
    const dz = sdk.getState().nearbyNpcs.find((n: any) => /drezel/i.test(n.name));
    if (dz) {
      const before = ess();
      await sdk.sendUseItemOnNpc(sdk.findInventoryItem(/^rune essence$/i).slot, dz.index);
      const end = Date.now() + 40_000; let idle = 0;
      while (Date.now() < end && idle < 10) { const d = sdk.getState().dialog; if (!d.isOpen) { idle++; await sleep(500); continue; } idle = 0; await sdk.sendClickDialog(0); await sleep(450); }
      log.push(`essence ${before} -> ${ess()}`);
      // Talk once more to complete.
      await bot.talkTo(dz);
      const end2 = Date.now() + 30_000; let idle2 = 0;
      while (Date.now() < end2 && idle2 < 10) { const d = sdk.getState().dialog; if (!d.isOpen) { idle2++; await sleep(500); continue; } idle2 = 0; await sdk.sendClickDialog(0); await sleep(450); }
    }
    log.push(`msgs: ${sdk.getState().gameMessages?.slice(-4).map((m: any) => m.text).join(' | ')}`);
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], prayer: sdk.getSkill('Prayer').baseLevel, inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`).filter((s: string) => !/essence/i.test(s)) };
};
