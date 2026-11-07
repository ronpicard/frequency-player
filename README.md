# Frequency Player

Frequency Player is a tone and frequency generator that runs in the browser. Play any frequency from 20 Hz to 20 kHz as a sine, triangle, square, or sawtooth wave, and always see which musical note it is and how many cents it sits from that note. Drag a dial of note names to tune by ear, tap a piano key to jump straight to a note, or type an exact frequency. Try the [live app](https://ronpicard.github.io/frequency-player/); it works on phones and desktops.

## How to use it

- Press **Play** to start the tone and **Stop** to end it. Changes apply while it plays, smoothly and without clicks.
- **Tuning dial:** drag the strip of note names left or right. Every note is 56 pixels apart, so small drags make fine changes; flick it and it glides. With **Snap dial to notes** on, the dial settles on the nearest note when you let go. The mouse wheel and the arrow keys also turn it (Shift for 1-cent steps).
- **Type a frequency:** tap the big number, type a value such as `440`, `1000 Hz`, or `2.5k`, and press Enter.
- **Step buttons:** `÷2` and `×2` jump an octave, `−½` and `+½` a semitone, and `−1`, `−.1`, `+.1`, `+1` change by hertz. Hold a button to repeat.
- **Range slider:** sweeps the full 20 Hz–20 kHz range on a logarithmic scale, so every octave gets the same length.
- **Piano:** all 88 keys, A0 to C8. Tap a key to set its exact frequency. When the tone is stopped, a tap also plays a short preview. The keyboard scrolls to follow the current note.
- **Note readout:** the note name and octave nearest the current frequency, its offset in cents, and **Snap to** for jumping to that exact note.
- The menu at the top sets the reference pitch for A4 (415, 432, 435, 440, 442, or 444 Hz), which changes every note frequency.
- Presets jump to common test tones: 60 Hz mains hum, middle C, 432 Hz, A440, 1 kHz, and 10 kHz.
- Keyboard: Space plays and stops, Up and Down move a semitone (Shift for an octave), Left and Right move 1 Hz (Shift for 0.1 Hz).
- Frequency, waveform, volume, snap, and reference pitch are remembered between visits.
- **App switcher:** the links at the top open the sibling tools, Instrument Tuner (Tuner) and Pitch Tracker (Pitch).
- **Layout:** on phones the play button, waveforms, and volume stay pinned to the bottom of the screen; on desktops they sit in a column beside the dial and the piano spans the full width.

Start at a low volume. High frequencies and loud tones can damage hearing and small speakers, and many phone and laptop speakers cannot reproduce frequencies below about 100 Hz.

## How it works

- A single Web Audio oscillator feeds a gain node. Starting and stopping ramp the gain, and frequency changes glide over a few milliseconds, so the speaker never sees a step.
- Square and sawtooth waves are much louder than a sine at the same gain, so each waveform is trimmed to a similar loudness, and the volume slider follows a squared curve that feels even to the ear.
- Notes use twelve-tone equal temperament relative to the chosen A4.

## Development

Requires Node.js 22 (see `.nvmrc`).

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm test` runs 15 Vitest unit tests covering note math, the logarithmic slider, semitone steps, snapping, and frequency parsing. Pushing to `main` runs the tests, builds, and deploys to GitHub Pages through `.github/workflows/deploy.yml`.

Built with React 19, TypeScript, Vite, and the Web Audio API, with no other runtime dependencies. Contributor and AI agent rules are in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
