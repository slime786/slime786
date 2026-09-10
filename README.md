# Moheen Mahmood — V8.4.1 Ticker Collision Fix

This version fixes the overlapping live ticker seen in V8.4.

## Cause
V8.4 used two independently animated ticker tracks. Because the two tracks did not have
perfectly identical rendered widths, they could drift into one another and overlap.

## Fix
V8.4.1 uses:
- one single animated marquee
- two geometrically identical content groups
- fixed chip widths
- clipped long headlines
- mirrored live data
- one synchronized animation loop

The live BTC/ETH, sparklines, London time, US session, rotating technology headlines,
and HIGH SIGNAL detector are all retained.

Upload all files in this ZIP directly to the root of `main`.
