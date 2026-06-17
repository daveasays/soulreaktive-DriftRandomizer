# soulreaktive-driftrandomizer-v1-0

An Ableton Live extension built with `@ableton-extensions/sdk`.

I always wish Ableton add a random clickable button to their Instruments & Fx devices (not when they are racked), now it's possible with this 'lil extension.
This is another cool starting point, when you find somthing sounding good, you can go further in sound designing Drift, or simply save this state as new preset.

You can choose a pourcentage of randomness from 0 to 100%. Initial start is 50%

Btw, the number of Unison voices is not exposed by the SDK. There are no "Voices" or "Poly" parameters. Ableton simply doesn't expose it.
What the SDK does expose for Unison is only "Unison Amount"—which is already randomized by the current code.

Global volume is set to -12db for each random, to prevent bad surprise.

## Get Started

Learn about building extensions: https://ableton.github.io/extensions-sdk/
Usage:
Right-click on a MIDI track (clip vew or arrangment view) containing a Drift → search in extention menu: soulreaktive-driftrandomizer 
**Randomize Drift**


## Setup

The path to Ableton Live's Extension Host module is stored in `.env` as
`EXTENSION_HOST_PATH`. The generator filled this in for you; edit it if your
install moves.

## Scripts

```sh
npm start                  # build + run in Live's Extension Host
npm run build              # production bundle of src/extension.ts
npm run build:dev          # dev bundle (sourcemaps, not minified)
npm run package            # build for production + create a .ablx archive
```
