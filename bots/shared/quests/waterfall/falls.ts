// Waterfall Quest finale. Raft (2509, 3493) -> island; rope on rock (2512, 3468); rope on
// tree (2512, 3465) -> ledge; ledge door (2511, 3464) needs Glarial's amulet -> dungeon.
// Crate (2589, 9888) = key; key on door (2566, 9902); 1 air + 1 water + 1 earth on each of
// the 6 pillars; amulet on the statue; urn on the chalice.
import { walk } from '../../travel';
import { sleep, startGuard, foodCount } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk, { eatAt: 0.6 });
  const waitMove = async (ms = 15_000) => {
    const x0 = p().worldX, z0 = p().worldZ; const end = Date.now() + ms;
    while (Date.now() < end) { if (p().worldX !== x0 || p().worldZ !== z0) return true; await sleep(400); }
    return false;
  };
  try {
    if (!skip.has('river') && p().worldZ < 9000) {
      if (inv(/glarial's amulet/i)) await bot.equipItem(/glarial's amulet/i);
      log.push(await walk(bot, sdk, 2510, 3494, 1, 'Camelot->raft'));
      const raft = (await sdk.scanNearbyLocs(5)).find((l: any) => /raft/i.test(l.name));
      await sdk.sendInteractLoc(raft.x, raft.z, raft.id, 1);
      await waitMove(); await sleep(3000); await bot.dismissBlockingUI();
      log.push(`island ${p().worldX},${p().worldZ} hp ${p().hp}`);
      // Rope on the rock from the island.
      await sdk.sendUseItemOnLoc(inv(/^rope$/i).slot, 2512, 3468, 1996);
      await sleep(9000); await bot.dismissBlockingUI();
      log.push(`after rock ${p().worldX},${p().worldZ}`);
      const tree = (await sdk.scanNearbyLocs(6)).find((l: any) => /tree/i.test(l.name) && l.x === 2512 && l.z === 3465);
      await sdk.sendUseItemOnLoc(inv(/^rope$/i).slot, 2512, 3465, tree?.id ?? 2020);
      await waitMove(); await sleep(2000); await bot.dismissBlockingUI();
      log.push(`ledge ${p().worldX},${p().worldZ}`);
      const door = (await sdk.scanNearbyLocs(4)).find((l: any) => /door/i.test(l.name));
      if (door) { await sdk.sendInteractLoc(door.x, door.z, door.id, 1); await waitMove(); await sleep(2000); await bot.dismissBlockingUI(); }
      log.push(`dungeon ${p().worldX},${p().worldZ} msgs: ${sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text).join(' | ')}`);
    }
    if (p().worldZ < 9000) throw new Error('not in the waterfall dungeon');
    guard.check();
    if (!skip.has('key') && !inv(/key/i)) {
      log.push(await walk(bot, sdk, 2589, 9887, 1, 'entry->crate'));
      const crate = (await sdk.scanNearbyLocs(4)).find((l: any) => /crate/i.test(l.name));
      if (crate) await sdk.sendInteractLoc(crate.x, crate.z, crate.id, 1);
      for (let i = 0; i < 12 && !inv(/key/i); i++) await sleep(500);
      await bot.dismissBlockingUI();
      log.push(`key ${inv(/key/i)?.name}`);
    }
    if (!skip.has('door')) {
      log.push(await walk(bot, sdk, 2566, 9901, 1, 'crate->locked door'));
      const d = (await sdk.scanNearbyLocs(5)).filter((l: any) => /door/i.test(l.name)).sort((a: any, b: any) => a.distance - b.distance)[0];
      log.push(`door ${d?.x},${d?.z}`);
      if (d && inv(/key/i)) { await sdk.sendUseItemOnLoc(inv(/key/i).slot, d.x, d.z, d.id); await waitMove(); await sleep(1500); }
      log.push(`after door ${p().worldX},${p().worldZ} ${sdk.getState().gameMessages?.slice(-1)[0]?.text}`);
    }
    // Pillars: one of each rune per pillar.
    const pillars = (await sdk.scanNearbyLocs(20)).filter((l: any) => /pillar/i.test(l.name));
    log.push(`pillars ${pillars.map((x: any) => `${x.x},${x.z}`).join(' ')}`);
    for (const pl of pillars) {
      for (const rune of [/^air rune$/i, /^water rune$/i, /^earth rune$/i]) {
        guard.check();
        const r = inv(rune);
        if (!r) continue;
        const before = r.count;
        await sdk.sendUseItemOnLoc(r.slot, pl.x, pl.z, pl.id);
        for (let i = 0; i < 12 && (inv(rune)?.count ?? 0) === before; i++) await sleep(400);
      }
    }
    log.push(`runes left: ${sdk.getInventory().filter((i: any) => /rune$/i.test(i.name)).map((i: any) => `${i.name} x${i.count}`).join(', ') || 'none'}`);
    const statue = (await sdk.scanNearbyLocs(20)).find((l: any) => /statue/i.test(l.name));
    if (statue) {
      if (!inv(/glarial's amulet/i)) await bot.unequipItem(/glarial's amulet/i);
      await sleep(800);
      await sdk.sendUseItemOnLoc(inv(/glarial's amulet/i).slot, statue.x, statue.z, statue.id);
      await waitMove(10_000); await sleep(2000); await bot.dismissBlockingUI();
      log.push(`after statue ${p().worldX},${p().worldZ} ${sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text).join(' | ')}`);
    }
    const chalice = (await sdk.scanNearbyLocs(15)).find((l: any) => /chalice/i.test(l.name));
    if (chalice && inv(/urn/i)) {
      await sdk.sendUseItemOnLoc(inv(/urn/i).slot, chalice.x, chalice.z, chalice.id);
      await sleep(5000); await bot.dismissBlockingUI();
    }
    log.push(`msgs: ${sdk.getState().gameMessages?.slice(-4).map((m: any) => m.text).join(' | ')}`);
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk), att: sdk.getSkill('Attack').baseLevel, str: sdk.getSkill('Strength').baseLevel };
};
