// Holy Grail: Entrana trip. Bank weapons/armour (Catherby), Port Sarim ship monk
// (3045, 3236) "Yes, okay, I'm ready to go.", High Priest (2851, 3349) -> Crone, then the
// Entrana ship monk (2835, 3336) "Yes, I'm ready to go." back.
import { walk } from '../../travel';
import { talk, sleep, startGuard } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  const waitTeleport = async (ms = 30_000) => {
    const x0 = p().worldX; const end = Date.now() + ms;
    while (Date.now() < end) {
      if (Math.abs(p().worldX - x0) > 50) return true;
      const d = sdk.getState().dialog; if (d.isOpen && d.options.length <= 1) await sdk.sendClickDialog(0);
      await sleep(500);
    }
    return false;
  };
  try {
    if (!skip.has('bank')) {
      log.push(await walk(bot, sdk, 2809, 3440, 2, 'Camelot->Catherby bank'));
      for (const e of sdk.getState().equipment) await bot.unequipItem(e.name);
      await sleep(1000);
      await bot.openBank();
      for (const re of [/scimitar|sword|excalibur|dagger|wolfbane|shield|amulet|gloves/i]) {
        for (const it of sdk.getInventory().filter((i: any) => re.test(i.name))) await bot.depositItem(new RegExp('^' + it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), -1);
      }
      await bot.closeBank();
      log.push(`equip: ${sdk.getState().equipment.map((e: any) => e.name).join(', ') || 'none'}`);
    }
    if (!skip.has('boat')) {
      log.push(await walk(bot, sdk, 3046, 3236, 2, 'Catherby->Port Sarim monks'));
      log.push({ monk: await talk(bot, sdk, /monk of entrana/i, [/ready to go/i]) });
      await waitTeleport();
      log.push(`after boat ${p().worldX},${p().worldZ}`);
    }
    if (p().worldX < 2900) {
      log.push(await walk(bot, sdk, 2851, 3350, 2, 'dock->High Priest'));
      log.push({ priest: await talk(bot, sdk, /high priest/i, [/grail/i, /searching/i]) });
      const crone = sdk.getState().nearbyNpcs.find((n: any) => /crone/i.test(n.name));
      if (crone) log.push({ crone: await talk(bot, sdk, /crone/i, [/searching/i]) });
      log.push(await walk(bot, sdk, 2836, 3337, 2, 'priest->Entrana monks'));
      log.push({ monk2: await talk(bot, sdk, /monk of entrana/i, [/ready to go/i]) });
      await waitTeleport();
      log.push(`back ${p().worldX},${p().worldZ}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], inv: sdk.getInventory().map((i: any) => i.name).filter((n: string) => !/kebab/i.test(n)) };
};
