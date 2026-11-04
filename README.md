# Sawaari

<img src="assets/brand/icon-preview.png" width="96" align="right" alt="Sawaari app icon">

A fake delivery-rider app built as an on-screen prop for a short film (a modern *Vikram aur Betaal*: the rider is Vikram, the cargo is Betaal). One phone sits in the actor's hand and shows full-screen, animated rider screens. The crew fires each moment from a second phone, or from a hidden panel on the same phone.

It's a small, real Android app: React Native + Expo, a Firebase Realtime Database backend that keeps the phones in sync, an SVG night map with animated routes, and a GitHub Actions pipeline that builds a signed APK on every push.

## What's on screen

| Screen | What happens |
|---|---|
| **Dashboard** | A struggling rider's day: ₹186 earned, overdue cash deposit, falling weekly earnings, penalties. |
| **Order request** | Full-screen request with a payout that counts up, a pulsing icon, a route preview, an accept countdown and **swipe to accept**. |
| **Ride** | Night map from the banyan (Purana Bargad) to Shamshaan Ghat, with a moving bike marker, an ETA, minutes and km left, a progress bar, the payout, and an updates feed. |
| **Reroute** | *GPS signal lost*: the map shakes and flickers red, the ETA goes `--:--`, then *Recalculating…*, then the route redraws back to the banyan with *Cargo returned to pickup* and a **Restart trip** swipe. |
| **Messages** | Banners that drop in over any screen (blue / amber / red) and stay in the ride's updates, e.g. the −₹5,000 late penalty with the payout struck through. |
| **Arrival** | *Delivery point reached*: Confirm delivery, or Cancel order → "You will forfeit ₹46,000. Are you sure?" → earnings roll down to **₹0**. |

The story clock on screen ticks forward in real time from each cue. The map warms slightly at dawn.

## The cue sheet

Everything is pre-loaded **episode by episode** from the script, with timings that hold together across one night: a full trip takes 36 minutes, every restart ETA is restart time + 36 min, and after the third restart the app switches to a fixed **"Deliver by 6:12 AM"** deadline.

| Ep | Story time | Cue |
|---|---|---|
| 1 Gappu | 1:49 → 2:16 AM | Order request ₹51,000 → ride to the banyan → trip starts (ETA 2:34) → Betaal gone: reroute, restart ETA 2:57 |
| 2 Do Chhatein | 2:21 → 2:41 AM | Restart → reroute (ETA 3:17) → **late penalty −₹5,000**, payout ₹46,000 |
| 3 Mistri | 2:43 → 3:04 AM | Speeding ride → overspeeding warning → reroute: *deliver by 6:12 AM* |
| 4 Taala | 3:09 → 3:46 AM | Fog ride → weak GPS → engine dies: reroute |
| 5 Raddiwala | 4:19 → 5:31 AM | On foot → reroute, *41 min remaining* |
| 6 Aakhri Panna | 5:44 → 6:12 AM | Final ride at dawn → delivery point reached → back to the dashboard |

Every cue (text, colour, story time, ETA, map positions, marker speed, payout, the rider's swipe label), the trip details and the dashboard can be **edited, added or deleted on any paired phone**, and the changes sync to the others. *Reset everything to the template* brings the script version back.

The actor's swipes (accept, start trip, restart trip) move on to the next screen cue by themselves; messages stay for the crew to fire on cue.

## Phones and pairing

- Pick **Rider** or **Director** on first launch. You can switch at any time.
- **Pairing:** tap *Make a new 5-digit code* on one phone and type the same code on the others. Any number of phones can join, e.g. a backup rider phone or two directors. **Unpair** at any time, and a new code is made every time.
- **Crew panel on the rider phone:** hold the logo on the dashboard, or hold the clock on any full-screen view. It has the same cue sheet with a delay timer: pick 5–60 s, the panel closes, and the cue fires on time with no internet needed.

## Backend: Firebase Realtime Database

Paired phones share a room at `rooms/<5-digit code>` in the project's Realtime Database:

```
rooms/48217/
  meta      created time
  show      the cue sheet, trip details and dashboard (edited from any phone)
  live      what the rider phone shows right now
  devices   which phones are connected (cleared when they disconnect)
  rider     the actor's last action, shown to the director
```

### One-time setup (Firebase console)

1. Firebase console → project **com-sawaari-rider** → **Build → Realtime Database → Create database**.
2. Location: **United States (us-central1)**. The app expects `https://com-sawaari-rider-default-rtdb.firebaseio.com`. If you pick another region, paste its URL in the app under *Pair phones → Show database setting*.
3. Start in **locked mode**, then open the **Rules** tab, paste [`database.rules.json`](database.rules.json) and **Publish**. Only 5-digit rooms can be read or written. Nothing can be listed.

## Rebranding

The app's identity lives in [`brand.config.json`](brand.config.json): app name, company name, tagline, colours and rider name. To change the icon, replace the PNGs in `assets/`. They're generated from the SVG sources in `assets/brand/`. Commit, and a new APK appears under **Releases** about 10 minutes later.

## Project structure

```
App.tsx                 mode picker, providers
src/show/               data model, script template, cue logic (applyCue), story clock
src/sync/ShowContext    Firebase rooms: pairing, syncing, presence, delayed fire
src/stage/              full-screen rider views: OfferScreen, RideScreen, ArrivalScreen,
                        NightMap (SVG), AlertBanner, swipe slider, countdown ring
src/crew/               cue sheet, cue editor, trip editor, pairing, crew panel
src/Director.tsx        director phone
src/RiderHome.tsx       rider phone
src/RiderDashboard.tsx  dashboard view; src/editors/DashboardEditor.tsx edits it
database.rules.json     Realtime Database rules
.github/workflows/      APK build on GitHub Actions
```

## Building

Nothing to install locally. GitHub Actions runs `expo prebuild` and Gradle, signs the APK and publishes `Sawaari-Rider-<n>.apk` as a release. To develop locally: `npm install`, then `npx expo run:android` with a phone connected.
