// Merlin's Crystal, Keep Le Faye stage A: food (Ardougne baker), insect repellent (ground
// spawn 2807, 3450, Catherby), then the crate (2801, 3442) -> shipped to Keep Le Faye.
import { walk } from '../../travel';
import { buy, sleep, startGuard, foodCount } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  try {
    if (!skip.has('food') && foodCount(sdk) < 15) {
      log.push(await walk(bot, sdk, 2668, 3311, 3, 'market->baker'));
      log.push(await buy(bot, /baker/i, /^cake$/i, 3));
      log.push(await buy(bot, /baker/i, /^chocolate slice$/i, 8));
      log.push(await buy(bot, /baker/i, /^bread$/i, 10));
      log.push(`food ${foodCount(sdk)}`);
    }
    if (!sdk.findInventoryItem(/insect repellent/i)) {
      log.push(await walk(bot, sdk, 2807, 3450, 2, 'Ardougne->repellent'));
      const g = (await sdk.scanGroundItems()).find((x: any) => /insect repellent/i.test(x.name));
      if (g) log.push((await bot.pickupItem(g)).message);
      else log.push('no repellent on the ground (respawning?)');
    }
    if (!skip.has('crate')) {
      log.push(await walk(bot, sdk, 2801, 3443, 1, 'to Arhein crate'));
      const crate = (await sdk.scanNearbyLocs(4)).find((l: any) => /crate/i.test(l.name) && l.x === 2801 && l.z === 3442);
      const opt = crate?.optionsWithIndex?.find((o: any) => /search|hide|climb/i.test(o.text));
      log.push(`crate opts ${crate?.options?.join('/')}`);
      if (crate) {
        await sdk.sendInteractLoc(crate.x, crate.z, crate.id, opt?.opIndex ?? 2);
        const end = Date.now() + 90_000;
        let idle = 0;
        while (Date.now() < end && idle < 10) {
          const d = sdk.getState().dialog;
          if (!d.isOpen) { idle++; await sleep(500); continue; }
          idle = 0;
          const yes = d.options.find((o: any) => /^yes/i.test(o.text));
          if (yes && d.options.length > 1) await sdk.clickDialogByText(/^yes/i);
          else await sdk.sendClickDialog(0);
          await sleep(400);
        }
      }
      log.push(`after crate ${p().worldX},${p().worldZ},${p().level}`);
      log.push({ npcs: sdk.getState().nearbyNpcs.slice(0, 8).map((n: any) => `${n.name} ${n.combatLevel} ${n.x},${n.z}`) });
      log.push({ locs: (await sdk.scanNearbyLocs(15)).filter((l: any) => /stair|ladder|door|crate/i.test(l.name)).map((l: any) => `${l.name} ${l.x},${l.z} [${l.options.join('/')}]`).slice(0, 10) });
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk) };
};
