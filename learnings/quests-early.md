# Early quests: Cook's Assistant + The Restless Ghost (verified 2026-10-31)

Both done together in one route with `bots/Spencebot/quests.ts`. XP on the shared server is boosted
(about 25x), so one quest gave Cooking level 30 and Prayer level 47.

## Facts that differ from the wiki
- The priest is **Father Aereck**. Open with "I'm looking for a quest!". Afterwards he says "Have you got rid of the ghost yet?".
- **Father Urhney** is at (3235, 3154), in the swamp south of the castle. Opening line is "Go away!". Choose
  "Father Aereck sent me to talk to you.", then "He's got a ghost haunting his graveyard." He gives the Ghostspeak amulet. Equip it.
- **Coffin** (3249, 3192) is inside a small hut. Use option `Open` (not `Search`). The ghost appears at (3249, 3194).
  Talk to it: "Yep, now tell me what the problem is." Re-find the coffin after it opens: the object id changes (use fresh `findNearbyLoc`).
- **Wizard Tower ladder** (3104, 3162) is in a small room. A closed door at (3111, 3163) can make `walkTo` fail with
  "unreachable". Open it by hand with `interactLoc(door, 'Open')`. The ladder down is `Climb-down`, to (3104, 9576).
- **The skull is a ground item** at (3120, 9567) in the basement, not an altar search. Taking it spawns a level 13 skeleton at
  (3120, 9565). Pick up, run to the ladder (3103, 9576), `Climb-up`. It cost 2 HP at 10 max HP.
- Put the skull in with `useItemOnLoc(skull, coffin)` on the **open** coffin.
- **Lumbridge mill** has three floors. Ladder at (3164, 3307). Hopper (3166, 3307) and `Hopper controls` are on level 2.
  Use grain on the hopper, `Operate` the controls, climb down twice, then `Empty` the `Flour bin` with a pot in the inventory.
  After a ladder, wait for `player.level` to change before the next action. State lags 1-3 s.
- Wheat is at (3160, 3301-3305). Eggs lie in the chicken pen near (3231, 3296).
- **Milk:** there is no dairy cow object. Use an empty bucket on any `Cow` NPC (`bot.useItemOnNpc`). Cows are near (3253, 3262).

## Efficient order (about 15 min on the shared server)
Aereck, Urhney, graveyard ghost, Wizard Tower skull, windmill flour, eggs, milk, graveyard skull, Cook.
