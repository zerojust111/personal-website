Flappy Bird Remastered - AIE1101 Midterm Milestone
Author: Jiang Yucheng (126090293)
Starter project: Flappy Bird Game (classroom version)

HOW TO RUN
----------
Option A (recommended): double-click start_game.bat
  - It starts a tiny local web server and opens the game in your browser.
  - Close the black console window to stop the server.
  - Requires Python on PATH (any Python 3). If nothing happens, use Option B.

Option B: double-click index.html
  - The game also runs directly from the folder, no server needed.

If the page looks stuck, refresh the browser once (F5).
Note: browsers only allow sound after your first click on the page - click the
canvas once and audio will work from then on (this is by design, not a bug).

CONTROLS
--------
Space / click canvas : flap
1 / 2 / 3            : switch difficulty on the start screen
S                    : open / close the skin shop
M                    : mute / unmute
In the shop: 1-4 switch categories, Enter confirms a purchase,
ESC or Space cancels the confirmation dialog.

WHAT WAS CHANGED (8 modifications, 7 of them functional)
--------------------------------------------------------
1. Three difficulties (gap / spacing / speed ramp / coin multiplier)
2. Best score saved separately per difficulty (localStorage)
3. Coin economy + 4-tab skin shop with purchase confirmation
4. Star pickups between pipes (blue +10, orange +5, blink animation)
5. Death animation (two hops, nose-dive) with separate impact/landing sounds
6. Skin system: 8 birds, 7 pipes, 5 worlds (Creeper bird, grass pipes...)
7. Audio: 14 sound cues + 3 synthesized BGM tracks, M to mute
8. Speed-reactive scoring: faster flight pays more per pipe

Files: index.html (page) + game.js (all logic, ~860 lines, no libraries)
       + assets/ (sprites and sounds).
Pixel art: flappy-bird-assets by samuelcust (MIT License).
