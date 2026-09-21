# MathTimer
A simple tool created for timing basic math questions. Users have 2 minutes to answer 30 questions for each test.

# Tests
## Addition
## Subtraction
## Multiplication
## Division

## Local admin panel

Admin tools are disabled by default. Open `admin.html?admin=1` (or add `?admin=1` to any page) to enable them for the current browser tab session. Open any page with `?admin=off`, or use **Turn off admin mode**, before deployment testing is finished.

The admin flag is a client-side testing convenience, not authentication. Keep admin mode off in student-facing sessions. The panel can set coins, reset progress, unlock rewards and pets, control eggs, cycle the daily shop, and override seasons.

## Verification

Run `node tests/progression.test.js` for progression, economy, seasonal, and daily-rotation checks. `tests/browser-audit.mjs` contains the responsive browser audit used during development.
