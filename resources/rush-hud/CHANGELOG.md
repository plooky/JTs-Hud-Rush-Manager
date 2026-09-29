# Changelog

## 1.9.1

- Keep weapon, knife, equipment and health-bar elements fixed when players shoot or perform other actions.
- Replace action-specific icon, stat and round-kill movement with a short light glow around the acting player's card.

## 1.9.0

- Preserve all six player cards when JT Hud Manager remaps different players onto the same observer slot.
- Include the original GSI player name in the death-card identity so rekeyed duplicates are still removed without collapsing distinct teammates.
- Show each player's primary, secondary, knife, equipment and grenades inside the player-card health strip.
- Keep health bars stable while weapon, ammo and equipment updates animate only the inventory icons.
- Hide the observed-player ammo counter whenever the active item does not report firearm ammunition.

## 1.8.1

- Deduplicate transitional GSI roster entries by team and observer slot so one player cannot produce multiple dead cards.
- Preserve the original dead-card identity when CS2 rekeys a player during the round, preventing a replacement card from entering beside it.

## 1.8.0

- Load current-match teams and player records from JT Hud Manager.
- Use manager team names and logos throughout the scoreboard, announcements, timeouts and match results.
- Use manager player names and portraits in roster cards and the observed-player panel.
- Match real players by SteamID and assign bots deterministically by observer slot within each selected team roster.

## 1.7.6

- Give CT and T round-winner cards symmetric team-color gradients and matching team-color borders on both outer edges.

## 1.7.5

- Align the T utility panel's right edge with the T scoreboard edge and the CT utility panel's left edge with the CT scoreboard edge throughout their entrance animation.

## 1.7.4

- Retain a confirmed dead player's card when delayed GSI snapshots temporarily omit that player or replay stale live health during the same round.
- Prevent a returning dead player from being treated as a new entry and replaying the enlargement animation.

## 1.7.3

- Remove the radar caption bar and room label, leaving only the bordered playable radar map.

## 1.7.2

- Render the radar overview on a 72% opacity surface so gameplay remains visible through its dark background.
- Keep player markers, facing arrows and room text at full opacity for broadcast readability.

## 1.7.1

- Keep confirmed player deaths latched through missing or stale same-round GSI health updates, preventing dead cards from briefly returning to full opacity.
- Lock the dead-card opacity against inherited JT animations while preserving its skull reveal.

## 1.7.0

- Add a room-aware RUSH radar using the overview textures and calibration shipped with CS2.
- Detect the randomized room from live roster positions and track player position, facing, team, observer slot, observed target and death state.
- Add replaceable radar backgrounds for every RUSH room, the party area and the convoy tiebreak.

## 1.6.4

- Remove overlapping brightness animations from dead player cards so their death opacity remains stable after the initial JT transition.

## 1.6.3

- Remove the assists counter from live player cards while retaining assists on match-end K/A/D results.

## 1.6.2

- Remove the complete RUSH survivor/status badge beneath the matchbar.

## 1.4.0

- Add a default-style animated RUSH results screen with winning team, team logos, final scores and player K/A/D.
- Require gameover and a conclusive score or explicit completed 7-7 tiebreak result before naming a winner.
- Document remaining differences from the default JT HUD in FEATURE-PARITY.md.

## 1.3.2

- Replace the fixed RUSH 3V3 label with the current CT-versus-T alive count during all phases. Missing or stale data displays dashes.

## 1.3.1

- Remove the top-right player counter.
- Give death skulls a 66px slot with room for the full 50px icon and its reveal animation.
- Add images.json for replacing team logos, roster/observer portraits, status icons and weapon images without code edits, including full-color images.

## 1.3.0

- Use the installed default JT HUD's theme, team logos and portraits with horizontal 3v3 cards, weapon silhouettes, round-kill cards, a central observer panel and an alive counter.
- Preserve native death/skull effects and delayed health trails while fitting names and images within the 1440p layout.
- Display RUSH rounds 1–14 and the 7–7 tiebreak instead of competitive round rules.
- Include Lexogrine weapon/status SVGs with their MIT notice; load the default theme and portraits from the manager.

## 1.2.0

- Adapt JT-style panel entrances, team gradients, damage numbers, delayed health trails, death transitions and score/observer change animations to the RUSH layout.
- Preserve rendered panels across GSI updates so timer changes do not restart animations.
- Respect reduced-motion preferences and suppress damage effects on reconnects and round resets.

## 1.1.0

First public release of JTs-Hud-Rush-Addon.

- Live RUSH spectator data through JT Hud Manager's existing GSI connection.
- Three-player team panels, reported scores, phase timer, health, armor, weapons, money, K/A/D, and observed-player ammunition.
- Native 2560 × 1440 layout with proportional scaling, safe margins, and long-name fitting.
- Waiting states for incomplete rosters and stale/disconnected feeds.
- Labeled synthetic preview and long-text stress preview.
- Importable `rush-hud.zip`, build script, and download checksum.

Tower ownership, castle progression, custom radar, and killfeed are not provided. Retain the native game displays for those features.
