# Shared bot scripts

Helpers, trainers and quest scripts written while Spencebot did the combat quests
(2026-10-31 / 11-01). Any bot can run them. The order to run them in is
`learnings/quest-route-combat.md`; step detail is `learnings/quests-early.md`.

Run a script through MCP with a repo-relative path (the module reloads when the file changes):

```text
execute_code({ bot_name: "<bot>", script: "bots/shared/train.ts", args: { npc: "^cow$", minutes: 5 } })
```

Inside inline `execute_code` code, import helpers with an absolute path, e.g.
`await import('<repo>/bots/shared/lib.ts')`.

**MCP module cache:** only the top-level script reloads. After editing `lib.ts` or `travel.ts`,
restart the MCP server (kill the `mcp/server.ts` bun process; the app respawns it).

## Helpers

| File | What |
|---|---|
| `lib.ts` | `talk` (never picks "No..." options, waits through dialog pauses), `buy`, `startGuard` (HP guard; `keep` regex for quest food), `setMeleeStyle` / `pickMeleeSkill` (Defence until 30, then Strength), `retreat`, `foodCount`, `waitPlane` |
| `travel.ts` | `walk()` = `bot.walkTo` with a per-tick trace; appends to `bots/<bot>/walklog.jsonl` |

## Trainers / money

| File | Args | What |
|---|---|---|
| `train.ts` | `npc, skill?, level?, minutes?, center?, minFood?, safe?` | melee on one NPC type; food-based retreat |
| `cows.ts` | `minutes, hides?, hpLevel?` | Lumbridge cows + hide looting |
| `thieve.ts` | `npc, level?, minutes?, center?, ids?` | pickpocket loop (Men -> Guards -> Knights of Ardougne) |

## Quest scripts

They are **leg scripts**: each assumes the bot starts where the previous leg ended (noted in the
route doc), and most skip steps already done (inventory checks) or take `args.skip: [...]`.

| Folder | Scripts, in order |
|---|---|
| `quests/cooks-restless/` | `quests.ts` (Cook's Assistant + Restless Ghost) |
| `quests/vampire-slayer/` | `vampire.ts` (Harlow stake, hammer, Count) - start with Morgan in `errands/draynor.ts` |
| `quests/priest-in-peril/` | `priest1.ts` (knock, dog) -> `priest2.ts` (Roald, bucket, monk key, Drezel) -> `priest3.ts` (monuments, well) -> `priest4.ts` / `priest5.ts` (essence trips) |
| `quests/merlins-crystal/` | `camelot.ts` -> `lancelot.ts` -> `keep1.ts` -> `ritual.ts` -> `excalibur.ts` -> `chaos.ts` -> `merlin.ts` |
| `quests/waterfall/` | `waterfall1.ts` (Almera, raft, book) -> `golrie.ts` -> `tomb.ts` -> `falls.ts` |
| `quests/holy-grail/` | `entrana.ts` -> `whistles.ts` -> `karamja.ts` -> `realm.ts` -> `fisherking.ts` -> `percival.ts` -> `grail.ts` |
| `quests/witchs-house/` | `witch1.ts` (everything before the fight) |
| `errands/` | supply runs: `alkharid.ts` (kebabs, Zeke), `ardougne.ts` (bakery, fight + loot), `draynor.ts` (Morgan, garlic, Port Sarim), `supplies.ts`, `varrock*.ts`, `east1.ts`, `east2.ts`, `west1.ts` |

## Known issues (fix before relying on them unattended)

- Several Holy Grail scripts decide "need a boat?" from the x coordinate only; from the Goblin Village
  that walked the bot overland to Ardougne instead of Port Sarim. Check the z coordinate too.
- Leg scripts were written for Spencebot's positions; a few start with a hard-coded walk.
- Some steps in the quest notes were done with inline code, not a script (Waterfall dungeon exit,
  Draynor Manor door route, Fisher King raw talk). `quests-early.md` lists them.
