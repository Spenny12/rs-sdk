// Priest in Peril part 1: leave Draynor Manor (east-wing doors), walk to the temple
// (doors 3408, 3489), knock: "Roald sent me to check on Drezel." -> "Sure.", then find the
// crypt entrance near the temple and kill the guardian dog.
import { walk } from '../../travel';
import { sleep, startGuard, setMeleeStyle, foodCount } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  const rawDoor = async (dx: number, dz: number, from: [number, number], to: [number, number]) => {
    await sdk.sendWalk(from[0], from[1], true);
    for (let i = 0; i < 15 && (p().worldX !== from[0] || p().worldZ !== from[1]); i++) await sleep(400);
    const door = (await sdk.scanNearbyLocs(3)).find((l: any) => /door/i.test(l.name) && l.x === dx && l.z === dz);
    if (door && door.options.some((o: string) => /^open$/i.test(o))) { await sdk.sendInteractLoc(dx, dz, door.id, 1); await sleep(1500); }
    await sdk.sendWalk(to[0], to[1], true);
    for (let i = 0; i < 15 && (p().worldX !== to[0] || p().worldZ !== to[1]); i++) await sleep(400);
  };
  try {
    if (!skip.has('manor')) {
      if (p().worldZ > 9000) {
        const up = (await sdk.scanNearbyLocs(10)).find((l: any) => /stair/i.test(l.name));
        if (up) { await bot.interactLoc(up, /up/i); for (let i = 0; i < 25 && p().worldZ > 9000; i++) await sleep(400); }
        log.push(`up at ${p().worldX},${p().worldZ}`);
      }
      if (p().worldX < 3125 && p().worldZ < 3365 && p().worldZ > 3340) {
        await rawDoor(3119, 3356, [3118, 3356], [3120, 3356]);
        await rawDoor(3123, 3360, [3123, 3359], [3123, 3361]);
        log.push(`after east wing ${p().worldX},${p().worldZ}`);
      }
    }
    if (!skip.has('knock')) {
      log.push(await walk(bot, sdk, 3408, 3487, 2, 'manor->temple doors'));
      const door = (await sdk.scanNearbyLocs(5)).find((l: any) => l.id === 3489 || /large door/i.test(l.name));
      const knock = door?.optionsWithIndex?.find((o: any) => /knock/i.test(o.text));
      log.push(`door ${door?.name} ${door?.x},${door?.z} opts ${door?.options?.join('/')}`);
      if (door) {
        await sdk.sendInteractLoc(door.x, door.z, door.id, knock?.opIndex ?? 2);
        const seen: string[] = [];
        const end = Date.now() + 40_000;
        let idle = 0;
        while (Date.now() < end && idle < 8) {
          const d = sdk.getState().dialog;
          if (!d.isOpen) { idle++; await sleep(500); continue; }
          idle = 0;
          const opt = d.options.find((o: any) => /roald sent me|^sure/i.test(o.text));
          if (opt) { seen.push('> ' + opt.text); await sdk.clickDialogByText(new RegExp('^' + opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')); }
          else await sdk.sendClickDialog(0);
          await sleep(450);
        }
        log.push({ knock: seen });
      }
    }
    // Look for the way down near the temple.
    const downs = (await sdk.scanNearbyLocs(30)).filter((l: any) => /trapdoor|ladder|stair/i.test(l.name)).map((l: any) => `${l.name} ${l.x},${l.z} [${l.options.join('/')}]`);
    log.push({ downs });
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk) };
};
