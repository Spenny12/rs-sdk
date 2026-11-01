// Holy Grail: Fisher King's realm. Blow a whistle at (2740-2743, 3234-3237) Brimhaven ->
// realm. Black Knight Titan (2791, 4722) with Excalibur worn + Protect from Melee. Fisherman
// (2802, 4706) -> bell; ring it near a maiden -> castle; Fisher King (level 1).
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
    if (p().worldZ < 4000) {
      const w = inv(/magic whistle/i);
      await sdk.sendUseItem(w.slot, w.optionsWithIndex?.find((o: any) => /blow/i.test(o.text))?.opIndex ?? 1);
      for (let i = 0; i < 15 && p().worldZ < 4000; i++) await sleep(500);
      await bot.dismissBlockingUI();
      log.push(`realm ${p().worldX},${p().worldZ}`);
    }
    if (!skip.has('titan')) {
      if (!sdk.getState().equipment.some((e: any) => /excalibur/i.test(e.name))) await bot.equipItem(/excalibur/i);
      const titan = sdk.getState().nearbyNpcs.find((n: any) => /titan/i.test(n.name));
      log.push(`titan ${titan ? `${titan.x},${titan.z} lvl ${titan.combatLevel}` : 'not visible'}`);
      if (titan) {
        await bot.activatePrayer('protect_from_melee');
        await bot.talkTo(titan);
        log.push({ titanTalk: await clickAll([/have at ye/i], 20_000) });
        const end = Date.now() + 240_000;
        while (Date.now() < end) {
          guard.check();
          if (!sdk.isPrayerActive('protect_from_melee') && (sdk.getPrayerState()?.prayerPoints ?? 0) > 1) await bot.activatePrayer('protect_from_melee');
          const t = sdk.getState().nearbyNpcs.find((n: any) => /titan/i.test(n.name));
          if (!t) break;
          if (!p().combat?.inCombat) await bot.attack(t);
          await sleep(1200);
        }
        await bot.deactivateAllPrayers();
        log.push(`after titan hp ${p().hp}/${p().maxHp} msgs: ${sdk.getState().gameMessages?.slice(-3).map((m: any) => m.text).join(' | ')}`);
      }
    }
    if (!skip.has('fisherman') && !inv(/bell/i)) {
      await bot.walkTo(2802, 4707, 2, { timeout: 60_000 });
      log.push({ fisherman: await talk(bot, sdk, /fisherman/i, [/get into the castle/i]) });
      log.push(`bell ${!!inv(/bell/i)}`);
    }
    if (!skip.has('castle') && inv(/bell/i)) {
      const maiden = sdk.getState().nearbyNpcs.filter((n: any) => /maiden/i.test(n.name)).sort((a: any, b: any) => a.distance - b.distance)[0];
      if (maiden) await bot.walkTo(maiden.x, maiden.z, 2, { timeout: 60_000 });
      const bell = inv(/bell/i);
      await sdk.sendUseItem(bell.slot, bell.optionsWithIndex?.find((o: any) => /ring/i.test(o.text))?.opIndex ?? 1);
      await sleep(2500);
      log.push({ bellDialog: await clickAll([], 15_000) });
      log.push(`after bell ${p().worldX},${p().worldZ}`);
      for (let i = 0; i < 2 && p().level < 1; i++) {
        const st = (await sdk.scanNearbyLocs(20)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /up/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
        if (!st) break;
        const lv = p().level; await bot.interactLoc(st, /up/i); await waitPlane(sdk, lv);
      }
      const king = sdk.getState().nearbyNpcs.find((n: any) => /fisher king/i.test(n.name));
      if (king) log.push({ king: await talk(bot, sdk, /fisher king/i, [/seek the holy grail/i, /look around/i]) });
      else log.push(`no fisher king visible at ${p().worldX},${p().worldZ},${p().level}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], hp: `${p().hp}/${p().maxHp}`, food: sdk.getInventory().filter((i: any) => /kebab/i.test(i.name)).length };
};
