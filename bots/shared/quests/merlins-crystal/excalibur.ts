// Merlin's Crystal: Excalibur. Lady of the Lake (2924, 3405) "I seek the sword Excalibur.",
// then the Port Sarim jeweller's door (3016, 3246, loc 59) spawns the beggar: give bread.
import { walk } from '../../travel';
import { talk, sleep, startGuard } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk, { keep: /^bread$/i });
  try {
    if (!args?.skipLady) {
      log.push(await walk(bot, sdk, 2924, 3404, 2, 'bats->Lady of the Lake'));
      log.push({ lady: await talk(bot, sdk, /lady of the lake/i, [/excalibur/i, /yes|ok/i]) });
    }
    if (!inv(/excalibur/i)) {
      if (!inv(/^bread$/i)) throw new Error('no bread for the beggar');
      log.push(await walk(bot, sdk, 3016, 3245, 1, 'Lady->jeweller door'));
      await sdk.sendInteractLoc(3016, 3246, 59, 1);
      const seen: string[] = [];
      const end = Date.now() + 60_000;
      let idle = 0;
      while (Date.now() < end && idle < 12 && !inv(/excalibur/i)) {
        const d = sdk.getState().dialog;
        if (!d.isOpen) { idle++; await sleep(500); continue; }
        idle = 0;
        const o = d.options.find((x: any) => /^yes/i.test(x.text));
        if (o && d.options.length > 1) { seen.push('> ' + o.text); await sdk.clickDialogByText(new RegExp('^' + o.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')); }
        else await sdk.sendClickDialog(0);
        await sleep(450);
      }
      // If the dialog did not start from the door, talk to the beggar directly.
      if (!inv(/excalibur/i)) {
        const beggar = sdk.getState().nearbyNpcs.find((n: any) => /beggar/i.test(n.name));
        if (beggar) log.push({ beggar: await talk(bot, sdk, /beggar/i, [/^yes/i]) });
      }
      log.push({ door: seen, excalibur: !!inv(/excalibur/i), msgs: sdk.getState().gameMessages?.slice(-3).map((m: any) => m.text) });
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, inv: sdk.getInventory().map((i: any) => i.name).filter((n: string) => /excalibur|bread/i.test(n)) };
};
