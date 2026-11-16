# ODD ONE OUT — PARTY RUSH

A browser-based party mini-game for **TVs, laptops, iPhones and Android phones**. The big screen hosts the arena; up to 12 players connect with any phone browser to play.

## Features
- TV-first responsive neon arcade interface, animated scene transitions and optimized illustration assets
- Online room creation, secret 8-character room codes, QR-code invitations and 3–12 player multiplayer
- Synchronized UP/DOWN decisions; one odd player wins only with a unique choice
- The odd player taps to collect virtual food or mix virtual cocktails (host can toggle modes); runners alternate left/right steps through a checkpoint **and back** to finish the round
- Live scoreboard, party rounds, sounds, phone vibration, fullscreen and reconnect support
- Offline local **Try Instant Demo** with simulated players, for previewing without an Ably account
- Same serverless backend for Apple/Android phone controllers, no app download

## Technology and free-tier requirements
- Static HTML/CSS/JavaScript (no npm dependencies), Node 20+ to run the build script
- Vercel Hobby for **personal, non-commercial** experiments; other plans/hosting for commercial use
- Ably Free for real-time publish/subscribe. This prototype uses Ably's CDN browser SDK and server-issued JWT tokens.
- QRCode.js loaded from jsDelivr only for generating the QR image; an ordinary join link remains available if the CDN is blocked.

## Deploy with GitHub and Vercel
1. Extract ZIP and upload contents of the `odd-one-out-party` folder at your GitHub repository **root**.
2. In Ably, **revoke your previously exposed API key**, create a NEW key with **Publish + Subscribe** permissions, and keep it private.
3. Go to https://vercel.com/new, import your GitHub repository, Framework Preset **Other**, Root Directory `./`, Build Command `npm run build`, Output Directory `dist`.
4. In Vercel project Settings > Environment Variables, add `ABLY_API_KEY` containing your **new full Ably API key** as `name:secret`. Enable it for Production, then deploy/redeploy.
5. Open `https://YOUR-PROJECT.vercel.app` on a laptop or TV browser, click **CREATE PARTY ROOM**, and show QR.
6. Friends scan QR with any iPhone/Android camera or manually visit `https://YOUR-PROJECT.vercel.app/join?room=ROOMCODE`.
7. Minimum three joined players. Click **START ROUND** on the TV, then vote UP/DOWN on phones. One odd player collects points while runners alternate LEFT/RIGHT buttons to the target and back.

**Troubleshooting**: If room creation fails, open your Vercel Function logs and check that `ABLY_API_KEY` is configured. A Subscribe-only key will NOT work. `GET /api/token` requires role/room/id; its token response is confidential. Connection errors are shown in both host and player views. The Host's session credential stays in its browser session; if that tab is lost, create a fresh party.

## Local development
```sh
npm run dev
# http://localhost:3000
```
For static preview only choose **TRY INSTANT DEMO** (requires no API key). Online multiplayer locally requires `ABLY_API_KEY` supplied in your shell environment to the Node server (not in frontend). Another phone connecting over LAN must access the same reachable host URL.

## Build and test
```sh
npm test
npm run build
```

## Gameplay and limits
- 3–12 players. Choices are secret until revealed. Ties or missing votes trigger a new selection.
- A runner must reach 100% outbound and 100% return (40 alternating left/right steps total). The odd player taps to collect virtual food. First runners back end the 30-second round; each returning runner earns a completion bonus.
- The host is authoritative in the **browser** and validates inputs. This is a small private-party prototype, **not** a cheat-proof public esports back end. Server-authoritative persistent matches, reconnection history, anti-cheat enforcement, and moderation would be needed for public commercial launch.
- All drinks are virtual; no forced consumption or real-world drinking speed contests.
- QR room IDs are join codes rather than strong access-control passwords. Only share invite links with players you trust.
- The free plans have usage limits. Vercel Hobby is for non-commercial usage only.

## Security
The Ably key never goes into public JS. The `api/room.js` serverless endpoint creates room codes and signs a private host proof; the `api/token.js` endpoint verifies host proof before granting state-channel publish rights and issues short-lived channel-scoped Ably JWTs to browsers. The client may view its own short-lived token; never publicly share one. Keep server environment variables secret.

## Project
- `public/index.html`, `public/host.js`: TV/laptop host
- `public/join.html`, `public/player.js`: mobile controller
- `public/logic.js`: reusable rules and input validation
- `public/style.css`, `public/assets`: polished animated visual experience
- `api/room.js`, `api/token.js`: room creation and Ably authentication
- `scripts/build.mjs`, `scripts/dev.mjs`: build/local server
- `tests/game.test.mjs`: rule, scoring, and authentication tests

This is a playable implementation of the game mechanic using illustrated scene backgrounds. It is *not* a full 3D character-animation title yet; motion is provided by CSS, particles, effects and state transitions.
