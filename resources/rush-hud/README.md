# JTs-Hud-Rush-Addon

A CS2 RUSH spectator HUD for [JT Hud Manager](https://github.com/JohnTimmermann/JTs-Hud), using the default JT HUD's visual theme with RUSH-specific statistics. Designed for a transparent 2560 × 1440 broadcast source. Install it as a custom HUD in the existing manager.

[Download rush-hud.zip](https://github.com/plooky/JTs-Hud-Rush-Addon/releases/latest/download/rush-hud.zip) · [Releases and checksums](https://github.com/plooky/JTs-Hud-Rush-Addon/releases)

![Synthetic six-player preview](https://raw.githubusercontent.com/plooky/JTs-Hud-Rush-Addon/main/docs/preview.png)

The screenshot uses labeled synthetic data.

## Install

1. Install and run [JT Hud Manager](https://github.com/JohnTimmermann/JTs-Hud/releases). This addon was tested with its July 13, 2026 release.
2. Use the manager's GSI installation setting to install its CS2 configuration, then restart CS2.
3. Download **rush-hud.zip** from this project's release assets. GitHub's **Source code** ZIP is not the import package.
4. In the manager's **HUDs** tab, import `rush-hud.zip` and launch **RUSH Live for JT Hud**.
5. Join a RUSH game as a spectator or through GOTV. Keep CS2 and JT Hud Manager running.
6. For OBS or vMix on the same PC, add a browser source with width **2560**, height **1440**, and this default URL:

```text
http://localhost:1349/huds/rush-hud/index.html
```

The background is transparent. The layout scales proportionally to other 16:9 sizes. If your manager uses a different address, use its HUD URL. Keep the downloaded filename `rush-hud.zip`, because the manager uses it for the HUD's installation ID.

End users do not need Node.js or a separate addon server. Keep the manager's default HUD installed: the addon loads its stylesheet, team logos and character portraits from the same manager. Asset filenames are discovered automatically; the tested theme is the July 13, 2026 release. A future incompatible theme may require an addon update. Remove the addon through the manager's HUDs tab.

## Displayed data

The animated end-of-match screen appears three seconds after CS2 reports gameover, showing the winning team, final scores and player K/A/D. It stays while connected until the next game state. An unresolved result is labeled as waiting for a confirmed winner. The HUD also shows explicit round-win announcements, pause and team-timeout panels, reported timeout counts, and team utility totals during the buy phase. See [default HUD feature parity](FEATURE-PARITY.md) for remaining differences and data requirements.

- Three-player CT/T rosters, reported team scores, game phase and countdown.
- The scoreboard has no separate RUSH status or survivor-count badge beneath it, keeping that area clear.
- RUSH rounds 1–14 and a **Tiebreak** label at 7–7. No competitive /24 counter, overtime sets, halftime or loss-bonus calculations.
- Live player cards show health, armor, money, active and carried weapons, grenades, kills and deaths. Assists remain available on the match-end K/A/D results screen.
- Observed-player highlighting and ammunition.
- A top-left, room-aware RUSH radar selects the randomized arena from live player coordinates and tracks all reported players by position, facing direction, side, observer slot, observed target and death state. It includes the convoy tiebreak and party/warmup area.
- The default JT HUD's horizontal portrait cards, team logos, central observed-player portrait, weapon silhouettes, gradients, skull/death transitions and delayed red health trails. Floating damage numbers and score/observer transitions preserve their state across updates. Animations respect reduced-motion preferences. The top-right player counter is omitted.
- Element-level motion follows live events: the matchbar, player cards and observed panel enter in sequence; round changes flip the timer; scores pop; players animate on entry, death and revival; statistics, equipment and round-kill cards react to changes; and utility, round-win, pause and timeout panels animate both in and out. Routine countdown ticks do not restart animations.
- Round-kill cards use reported `state.round_kills`, separately from cumulative match kills.
- Waiting states for missing rosters and unavailable values. Old data clears after ten seconds without updates or immediately on disconnection.

The 1440p layout follows the default HUD: a top-center scoreboard and bottom-center observer panel flanked by horizontal team cards. The cards are enlarged for readable 3v3 data, with 36px bottom spacing. Long names wrap and shrink within their panels. Portraits and weapon images preserve their aspect ratio. The center of gameplay stays clear.

The manager's HUD panel provides tournament name/stage, CT and T colors, square corners, a compact live-round matchbar, model visibility, and extra advertisement spacing beneath the observed-player panel. Invalid color values fall back to the standard JT colors.

## JT Hud Manager teams and players

Create teams and players in JT Hud Manager, assign each player to a team, then select those teams in the manager's current match. The addon loads the manager records directly and refreshes them while the HUD is running.

- Current-match team names and logos replace the GSI/default values in the scoreboard, round winner, timeout and match-result panels.
- A player with a matching SteamID uses the manager username and avatar in the roster card and observed-player panel.
- Bots and other players without a matching SteamID are assigned within their selected team by ascending GSI observer slot. Manager roster order supplies the corresponding player order, and coach records are excluded.
- The current map's `reverseSide` setting swaps the manager's left/right teams between CT and T in the same way as JT's default HUD.
- If there is no current match, SteamID-matched player names and portraits still work. Team branding and bot roster assignment require a current match with both teams selected.
- Relative manager upload paths are resolved through the same JT Hud Manager address as the browser source, so OBS clients on another computer can load the assigned images.

## Limits and troubleshooting

**Retain CS2's native RUSH objective display.** The tower changes ownership when a player interacts with it, but that interaction and ownership state were absent from the captured GSI packets. The addon does not infer tower ownership from team scores, round winners or player positions. RUSH has no bomb/defuse UI. The addon does not provide a killfeed.

Full-team data requires CS2 to send an `allplayers` roster. A player-view feed may omit it. If the HUD is waiting, check that CS2 is in RUSH, that you are observing, and that the manager is receiving GSI updates. Restart CS2 after installing the GSI configuration. If the browser source cannot connect, check that the manager is running and the source uses its current address.

Verified with a local RUSH spectator session: warmup, active play, score changes, the following buy phase, health, weapons and ammunition. The local session reported five bots. Six-player layout and long-name fitting were tested using synthetic data at 2560 × 1440. Valve matchmaking/GOTV has not been separately validated.

## Replacing images

Edit **images.json** in the HUD folder. On Windows the installed folder is normally `%USERPROFILE%\jthm-huds\rush-hud`. Put replacement files in `assets/custom/`, then set their paths in `images.json` and refresh the OBS browser source. No JavaScript or CSS edits are required. Back up custom files and your configuration before importing an addon update, which may replace the installed folder.

- `portraits.CT` and `portraits.T`: roster portraits. `null` uses the installed default JT portrait.
- `observedPortraits.CT` and `observedPortraits.T`: central observer portraits. `null` uses the corresponding roster portrait.
- `logos.CT` and `logos.T`: scoreboard logos. `null` uses the default JT logo.
- `icons`: skull, kills, armor, helmet and bullets. Each can be a direct path string or an object with `src` and `tint`. Set `tint` to `false` for a full-color image; `true` uses the image's transparency as a team-colored silhouette.
- `weapons`: optional overrides keyed by GSI weapon name without `weapon_`, such as `ak47` or `flashbang`. Each accepts `src` and `tint`; `false` preserves colors, `true` renders a white silhouette. Existing weapon SVGs can also be replaced directly in `assets/weapons/`.
- `radar`: optional background overrides keyed by `room101` through `room104`, `room201` through `room212`, `room301`, `room401`, `roomparty` and `convoy`. A `null` value uses the bundled RUSH overview. The replacement must preserve the same 1024×1024 room calibration.

For example, change `portraits.CT` to `"./assets/custom/ct.jpg"`, set `icons.skull` to `"./assets/custom/skull.png"`, or add `"ak47": { "src": "./assets/custom/ak47.svg", "tint": true }` inside `weapons`. Supported Chromium formats include **SVG, PNG, JPG/JPEG, WebP, GIF, AVIF, BMP and ICO**. Animated GIF and animated WebP files retain their animation. Use `tint: false` for JPG and other full-color images because they do not provide a useful transparency mask. Images use contain sizing so their aspect ratio is preserved without cropping.

## Development

Use Node.js 20 or later and PowerShell. From this folder:

```powershell
node --test assignments.test.mjs model.test.mjs motion.test.mjs radar.test.mjs theme.test.mjs
powershell -NoProfile -File .\Build-RushHud.ps1
```

The build runs the tests and syntax check, then writes `dist/rush-hud.zip` and `dist/SHA256SUMS.txt`. To build and import into a running manager, use PowerShell 7:

```powershell
pwsh -NoProfile -File .\Build-RushHud.ps1 -Install
```

Append `?preview=1` to the installed HUD URL for a labeled synthetic preview, or `?preview=1&stress=1` for long names and extreme values. Remove these parameters for a live broadcast. Tests use synthetic data; local game captures are excluded from the repository and package.

The HUD registers in the manager's Socket.IO `huds` room and consumes raw `update` snapshots. It loads assignments from `/api/match`, `/api/teams` and `/api/players`, and refreshes them on manager match events, map changes and every five seconds. It activates for `map.mode === "rush"`, takes rosters from `allplayers`, and matches the observed player's `spectarget` or `steamid` against roster IDs. Radar coordinates come directly from each roster player's reported `position` and `forward`; if those fields are absent, the radar stays hidden instead of guessing an arena.

## Local RUSH testing

On a locally hosted CS2 server, load RUSH in the developer console:

```text
game_type 0; game_mode 6; mapgroup mg_rush_001; map rush_001
```

After the map loads, these server commands support a spectator-only bot test and end warmup:

```text
bot_join_after_player 0
bot_quota_mode normal
bot_quota 6
mp_warmup_pausetimer 0
mp_warmup_end
```

Actual bot count depends on available slots. These commands require control of the server; they are not a Valve matchmaking setup procedure.

## License and credits

Addon code is provided under the [MIT license](LICENSE). Weapon and status SVGs come from the Lexogrine/OpenHud React HUD template and retain their [MIT notice](assets/LICENSE-Lexogrine.txt). The bundled Oswald font is distributed under its [SIL Open Font License](assets/fonts/OFL.txt). JT Hud Manager is a separate project by its upstream authors. Its default theme and portraits are loaded from the installed manager and are not redistributed in this package.
