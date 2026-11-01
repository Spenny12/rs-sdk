// Priest in Peril part 3: crypt (trapdoor 3405, 3507) -> underground door -> golden key on
// each monument until the iron key appears; bucket on the well = murky water. Back up to
// Drezel (temple level 2): iron key on the cell door, murky water on Drezel (blessed),
// blessed water on the coffin, talk to Drezel.
import { sleep, startGuard, foodCount } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk);
  const clickThrough = async (ms = 20_000) => {
    const end = Date.now() + ms;
    let idle = 0;
    while (Date.now() < end && idle < 8) {
      const d = sdk.getState().dialog;
      if (!d.isOpen) { idle++; await sleep(500); continue; }
      idle = 0;
      const o = d.options.find((x: any) => !/continue/i.test(x.text) && !/^no\b/i.test(x.text));
      if (o && d.options.length > 1) await sdk.clickDialogByText(new RegExp('^' + o.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));
      else await sdk.sendClickDialog(0);
      await sleep(450);
    }
  };
  try {
    if (!inv(/iron key/i)) {
      if (p().worldZ < 9000) {
        await bot.walkTo(3405, 3508, 1, { timeout: 40_000 });
        const td = (await sdk.scanNearbyLocs(4)).find((l: any) => /trapdoor/i.test(l.name));
        await bot.interactLoc(td, /climb.?down/i);
        for (let i = 0; i < 25 && p().worldZ < 9000; i++) await sleep(400);
      }
      // Underground door(s): open by hand.
      const doors = (await sdk.scanNearbyLocs(20)).filter((l: any) => /door|gate/i.test(l.name) && l.options.some((o: string) => /^open$/i.test(o)));
      log.push(`doors: ${doors.map((d: any) => `${d.name} ${d.x},${d.z}`).join(' ')}`);
      const mons0 = (await sdk.scanNearbyLocs(30)).filter((l: any) => /monument/i.test(l.name));
      if (mons0.length === 0 && doors[0]) {
        await sdk.sendInteractLoc(doors[0].x, doors[0].z, doors[0].id, 1);
        await sleep(2500);
      }
      const mons = (await sdk.scanNearbyLocs(40)).filter((l: any) => /monument/i.test(l.name)).sort((a: any, b: any) => a.distance - b.distance);
      log.push(`monuments: ${mons.map((m: any) => `${m.x},${m.z}`).join(' ')}`);
      for (const m of mons) {
        if (inv(/iron key/i)) break;
        const gk = inv(/golden key/i);
        if (!gk) break;
        await sdk.sendUseItemOnLoc(gk.slot, m.x, m.z, m.id);
        for (let i = 0; i < 20 && !inv(/iron key/i); i++) {
          await sleep(500);
          const pp = p();
          if (Math.max(Math.abs(pp.worldX - m.x), Math.abs(pp.worldZ - m.z)) <= 1 && i > 6) break;
        }
        await bot.dismissBlockingUI();
      }
      log.push(`iron key ${!!inv(/iron key/i)}`);
      if (inv(/^bucket$/i)) {
        const well = (await sdk.scanNearbyLocs(40)).find((l: any) => /well/i.test(l.name));
        if (well) {
          await sdk.sendUseItemOnLoc(inv(/^bucket$/i).slot, well.x, well.z, well.id);
          for (let i = 0; i < 25 && !inv(/murky/i); i++) await sleep(500);
        }
        log.push(`murky water ${!!inv(/murky/i)}`);
      }
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk), inv: sdk.getInventory().map((i: any) => i.name) };
};
