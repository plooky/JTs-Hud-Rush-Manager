# Default JT HUD versus RUSH Live

Compared against the installed July 13, 2026 default HUD bundle and its panel.json. This is an implementation comparison, not a claim that every compiled default feature receives usable live data.

## Implemented

- Default visual theme, Oswald font, team logos and portraits, horizontal player cards, observed-player panel, weapon/grenade silhouettes, health/armor, money, K/A/D, ammunition and round-kill cards.
- Damage numbers, delayed health trails, flash brightness, skull/death transitions, observer highlight and score effects.
- RUSH round labels and the 7-7 tiebreak. Separate survivor/status badges are removed as requested.
- The default-style animated end-of-match screen shows the winner, final scores, replaceable team logos and three-player K/A/D lists. It appears three seconds after gameover and remains while connected until the game state changes. Missing/tied results do not fabricate a winner. An explicit completed round-15 tiebreak winner can resolve a retained 7-7 score.
- Version 1.5.0 adds explicit round-win announcements, pause/timeout overlays, reported timeout counts, buy-phase team utility totals, tournament branding, CT/T colors, corner/model/advertisement/compact-matchbar controls, fuller carried equipment strips and accumulated rapid-hit damage numbers.
- Version 1.6.0 adds event-driven motion to the matchbar, rosters, player entry/death/revival, observed player, timer, scores, statistics, equipment, round-kill cards, utility panels, round announcements, pauses and timeouts. Keyed elements stay mounted for exit transitions, and countdown-only updates remain quiet.
- Version 1.7.0 adds the default-style radar behavior adapted to RUSH's randomized arenas. Live player coordinates select the calibrated room overview and drive team-colored, directional player markers, including observed and dead states.
- Local image overrides, reduced motion, stale live-data clearing and disconnect cleanup.

## Missing features that can be adapted

1. **Manager profiles and match assignments:** custom player names/photos, team identities/logos and configured side reversal. RUSH uses raw GSI names/sides and local image overrides, not the default's profile/match enrichment pipeline. Preserve explicit team identity when changing sides.
2. **Series overlays:** best-of/map picks, series-win pips, next-map information and veto panels. These need an explicitly configured RUSH series; they must not assume competitive map rules.
3. **Additional layout variants:** the horizontal 3v3 layout is optimized for gameplay visibility; the default's vertical and camera layouts are not yet ported.

## Data-dependent or unsuitable without adaptation

- **Killfeed:** the default contains a renderer subscribing to kill events, but its manifest advertises killfeed=false. Raw GSI health/K/D snapshots do not reliably supply killer/victim/weapon/headshot attribution. A verified event source is required; the default renderer's presence does not prove a working feed.
- **ADR:** default results show K/D/ADR. RUSH results show K/A/D. Reliable ADR needs authoritative damage totals and round accounting, or complete captured round damage from the match start. Joining mid-match cannot recover missing damage history.
- **Player cameras:** the default avatar component has camera hooks. These require a separately configured video feed; the RUSH addon does not integrate it.
- **Bomb, plant and defuse widgets:** RUSH has no bomb or defuse objective, so these are intentionally excluded.
- **Loss bonuses, competitive halftime and overtime sets:** do not reuse competitive calculations in RUSH without verified equivalent rules.
- **RUSH tower:** tower ownership changes when a player interacts with it, but the captured GSI feed does not expose that interaction or ownership state. The HUD retains the native objective display and does not infer ownership from round winners or player positions.

## Recommended implementation order

Profile/side integration, optional series presentation and additional layouts are the next safe additions. Radar, killfeed, ADR, cameras and tower ownership remain conditional on verified inputs.
