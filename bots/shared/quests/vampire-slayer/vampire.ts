// Vampire Slayer finish: Dr Harlow's stake (2nd talk gives it for the beer), a hammer from
// the Varrock general store, then Count Draynor in the Draynor Manor crypt.
// Manor front door (3108, 3353) only opens from OUTSIDE (north side); stairs down (3115, 3357)
// -> crypt (3077, 9771). Exit via east-wing doors (3119, 3356) and (3123, 3360).
import { walk } from '../../travel';
import { talk, buy, sleep, startGuard, setMeleeStyle, foodCount } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  try {
    if (!skip.has('harlow') && !has(/stake/i)) {
      log.push(await walk(bot, sdk, 3277, 3491, 2, 'Roald->Harlow'));
      log.push({ harlow: await talk(bot, sdk, /harlow/i, [/ok mate|morgan|vampire|yes/i]) });
      log.push(`stake ${has(/stake/i)}`);
    }
    if (!has(/^hammer$/i)) {
      log.push(await walk(bot, sdk, 3216, 3415, 3, 'to Varrock general store'));
      log.push(await buy(bot, /shop keeper|shop assistant/i, /^hammer$/i, 1));
    }
    if (!has(/stake/i) || !has(/^hammer$/i) || !has(/^garlic$/i)) throw new Error(`missing: stake ${has(/stake/i)} hammer ${has(/^hammer$/i)} garlic ${has(/^garlic$/i)}`);

    if (p().worldZ < 9000) {
      // Approach the front door from the north (outside).
      log.push(await walk(bot, sdk, 3108, 3356, 1, 'Varrock->manor front door'));
      if (p().worldZ >= 3354) {
        const door = (await sdk.scanNearbyLocs(4)).find((l: any) => /door/i.test(l.name) && l.x === 3108 && l.z === 3353);
        if (door) { await sdk.sendInteractLoc(door.x, door.z, door.id, 1); for (let i = 0; i < 15 && p().worldZ >= 3354; i++) await sleep(400); }
      }
      log.push(`inside? ${p().worldX},${p().worldZ}`);
      log.push(await walk(bot, sdk, 3115, 3358, 1, 'hall->crypt stairs'));
      const stairs = (await sdk.scanNearbyLocs(5)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /down/i.test(o)));
      if (stairs) { await bot.interactLoc(stairs, /climb.?down|down|walk.?down/i); for (let i = 0; i < 25 && p().worldZ < 9000; i++) await sleep(400); }
      log.push(`crypt ${p().worldX},${p().worldZ}`);
    }
    log.push(`style -> ${await setMeleeStyle(sdk)}`);
    const coffin = (await sdk.scanNearbyLocs(15)).find((l: any) => /coffin/i.test(l.name));
    log.push(`coffin ${coffin ? `${coffin.x},${coffin.z} ${coffin.options.join('/')}` : 'none'}`);
    if (coffin) {
      await bot.interactLoc(coffin, /open|search/i);
      await sleep(3000);
      await bot.dismissBlockingUI();
      const count = sdk.getState().nearbyNpcs.find((n: any) => /count draynor/i.test(n.name));
      if (count) {
        await bot.attack(count);
        const end = Date.now() + 120_000;
        while (Date.now() < end) {
          guard.check();
          if (foodCount(sdk) < 2) { log.push('low food during the Count'); break; }
          const c = sdk.getState().nearbyNpcs.find((n: any) => /count draynor/i.test(n.name));
          if (!c) break;
          if (!p().combat?.inCombat) await bot.attack(c);
          await sleep(1200);
          await bot.dismissBlockingUI();
        }
      }
      log.push(`msgs: ${sdk.getState().gameMessages?.slice(-4).map((m: any) => m.text).join(' | ')}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk), att: sdk.getSkill('Attack').baseLevel, inv: sdk.getInventory().map((i: any) => i.name) };
};
