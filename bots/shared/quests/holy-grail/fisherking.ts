// Holy Grail: back to the Fisher King for "You don't look too well." (sets finding_percival).
// Port Sarim seamen -> Karamja -> Brimhaven whistle -> realm (Titan if alive) -> bell near a
// maiden -> castle level 1 -> raw talk to "The Fisher King".
import { walk } from '../../travel';
import { talk, sleep, startGuard, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk, { eatAt: 0.6 });
  const clickAll = async (prefs: RegExp[], ms = 40_000) => {
    const end = Date.now() + ms; let idle = 0; const seen: string[] = [];
    while (Date.now() < end && idle < 8) {
      const d = sdk.getState().dialog;
      if (!d.isOpen) { idle++; await sleep(500); continue; }
      idle = 0;
      let o: any;
      for (const pr of prefs) { o = d.options.find((x: any) => pr.test(x.text)); if (o) break; }
      if (o && d.options.length > 1) { seen.push('> ' + o.text); await sdk.clickDialogByText(new RegExp('^' + o.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')); }
      else await sdk.sendClickDialog(0);
      await sleep(450);
    }
    return seen;
  };
  try {
    if (!skip.has('boat') && p().worldX > 2990 && p().worldZ < 4000) {
      log.push(await walk(bot, sdk, 3029, 3217, 3, 'Goblin Village->Port Sarim seamen'));
      log.push({ seaman: await talk(bot, sdk, /captain tobias|seaman/i, [/karamja|journey|yes|ok/i]) });
      for (let i = 0; i < 40 && p().worldX > 2990; i++) { await sleep(500); const d = sdk.getState().dialog; if (d.isOpen && d.options.length <= 1) await sdk.sendClickDialog(0); }
      const plank = (await sdk.scanNearbyLocs(6)).find((l: any) => /gangplank/i.test(l.name));
      if (plank) { await sdk.sendInteractLoc(plank.x, plank.z, plank.id, 1); await sleep(3000); }
      log.push(`Karamja ${p().worldX},${p().worldZ}`);
    }
    if (p().worldZ < 4000) {
      log.push(await walk(bot, sdk, 2742, 3235, 1, 'Musa Point->whistle spot'));
      const w = inv(/magic whistle/i);
      await sdk.sendUseItem(w.slot, w.optionsWithIndex?.find((o: any) => /blow/i.test(o.text))?.opIndex ?? 1);
      for (let i = 0; i < 15 && p().worldZ < 4000; i++) await sleep(500);
      await bot.dismissBlockingUI();
      log.push(`realm ${p().worldX},${p().worldZ}`);
    }
    const titan = sdk.getState().nearbyNpcs.find((n: any) => /titan/i.test(n.name));
    if (titan) {
      log.push('titan alive again: fighting');
      if (!sdk.getState().equipment.some((e: any) => /excalibur/i.test(e.name))) await bot.equipItem(/excalibur/i);
      await bot.activatePrayer('protect_from_melee');
      await bot.talkTo(titan);
      await clickAll([/have at ye/i], 20_000);
      const end = Date.now() + 240_000;
      while (Date.now() < end) {
        guard.check();
        const t = sdk.getState().nearbyNpcs.find((n: any) => /titan/i.test(n.name));
        if (!t) break;
        if (!p().combat?.inCombat) await bot.attack(t);
        await sleep(1200);
      }
      await bot.deactivateAllPrayers();
    }
    if (p().level === 0 && p().worldZ > 4690) {
      if (!inv(/bell/i)) {
        await bot.walkTo(2802, 4707, 2, { timeout: 60_000 });
        await talk(bot, sdk, /fisherman/i, [/get into the castle/i]);
        await bot.walkTo(2762, 4695, 1, { timeout: 60_000 });
        const b = (await sdk.scanGroundItems()).find((g: any) => /bell/i.test(g.name));
        if (b) await bot.pickupItem(b);
      } else {
        await bot.walkTo(2762, 4695, 1, { timeout: 60_000 });
      }
      const bell = inv(/bell/i);
      if (bell) {
        await sdk.sendUseItem(bell.slot, bell.optionsWithIndex?.find((o: any) => /ring/i.test(o.text))?.opIndex ?? 1);
        for (let i = 0; i < 12; i++) { await sleep(500); const d = sdk.getState().dialog; if (d.isOpen) await sdk.sendClickDialog(0); }
      }
      log.push(`castle ${p().worldX},${p().worldZ}`);
    }
    if (p().level < 1) {
      const st = (await sdk.scanNearbyLocs(15)).filter((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /up/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
      if (st) { const lv = p().level; await bot.interactLoc(st, /up/i); await waitPlane(sdk, lv); }
    }
    const king = sdk.getState().nearbyNpcs.find((n: any) => /fisher king/i.test(n.name));
    if (king) {
      await bot.walkTo(2765, 4684, 1, { timeout: 15_000 });
      await sdk.sendTalkToNpc(king.index);
      await sleep(1500);
      log.push({ king: await clickAll([/don't look too well/i], 60_000) });
    } else log.push(`king not visible at ${p().worldX},${p().worldZ},${p().level}`);
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], hp: `${p().hp}/${p().maxHp}` };
};
