# Dynamic Sfx Plugin (GB Studio 4.3.0)

Real-time, parameter-driven sound synthesis for GB Studio, replicating how
Pokémon Red/Blue generated all 151 cries on the Game Boy's sound hardware.

No audio files are involved: every sound is synthesized at runtime from a few
bytes of hardware instructions, exactly like the original game. All sound
data is authored in the IDE with the plugin's *Compile* events — the plugin
itself ships no built-in sounds. The example project includes the complete
Gen 1 data (38 base sounds, 151 presets) recreated with those events.

---

## How pokered does it (analysis)

### 38 base sounds + 2 modifier bytes = 151 presets

The game stores only **38 base sounds**. Each
Pokémon's entry is 3 bytes:

- **base sound** - the base notes to be played.
- **pitch modifier** - added to the raw 11-bit frequency register value of
  *every note* on the two pulse channels, and to the noise channel's
  polynomial counter register (so noise shifts pitch too).
- **length modifier** - every note's duration in frames is
  `len16 × (0x80 + length) / 256`, accumulated in 8.8 fixed point so
  fractional frames carry across notes. `$80` = normal speed, `$00` = double
  speed, `$FF` ≈ 1.5× longer.

### Base sound format

Each base sound is three command streams played simultaneously on hardware
channels 1 (pulse), 2 (pulse) and 4 (noise). Only four commands are used:

| Command | Effect |
|---|---|
| `square_note len, vol, fade, freq` | write duty/length, volume envelope (`vol<<4\|fade`), frequency + pitch mod, trigger |
| `noise_note len, vol, fade, poly` | same for the noise channel (polynomial counter + pitch mod) |
| `duty_cycle_pattern a,b,c,d` | 4×2-bit duty sequence, **rotated 2 bits every frame** — this per-frame duty animation is a big part of the Gen 1 timbre |
| `sound_ret` | end of channel |

The engine advances each channel once per VBlank: a note's delay counter
counts down, and when it hits 1 the next note's registers are written. While
a note sounds, the duty pattern keeps rotating into NRx1. A quirk faithfully
reproduced here: a computed delay of 0 wraps to 255 (`dec` before compare).

---

## What the plugin provides

```
plugins/DynamicSfxPlugin/
  engine/
    engine.json
    include/dynamic_sfx_player.h
    src/core/dynamic_sfx_player.c   runtime synthesizer (VBL-driven, ~like pokered's per-frame engine)
  events/
    eventCompileBaseSfx.js          author a base sound in the IDE (compiled to ROM data)
    eventCompilePresetSfx.js        author a preset in the IDE (compiled to ROM data)
    eventPlayCompiledBaseSfx.js     play a base sound by data symbol
    eventPlayCompiledPresetSfx.js   play a preset by data symbol
    eventStopDynamicSfx.js
```

### Authoring events — create base sfx and presets in the IDE

The two *Compile* events turn IDE input into ROM data at build time (via
`writeAsset`, like the ConfigLoadSave / CopyRomDataToRam plugins). They emit
**no runtime code** — just drop them in any script that gets compiled (e.g.
a scene's On Init, even of a scene that is never visited) and the data
exists in the ROM.

- **Compile Base Sfx Data** — a full note editor: give the sound a unique
  *Data Symbol*, then author up to 24 notes per channel (pulse 1, pulse 2,
  noise). Each note has length / volume / fade (negative = fade in) and
  frequency (or noise polynomial). Pulse channels can enable the rotating
  4-step duty pattern — the classic Gen 1 shimmer — and any note can switch
  to a new duty pattern mid-sound. Channels with 0 notes stay silent.
  A volume-0 note is a rest (the envelope is emitted as `0x08` to keep the
  DAC powered, exactly like pokered's rests).
- **Compile Preset Sfx Data** — packages a base sound + pitch + length as a
  named preset, referencing the base by its data symbol.

### Playback events

- **Play Compiled Base Sfx** — play a base sound by data symbol, with pitch
  and length as script values (variables/expressions work, so one sound can
  be endlessly re-pitched at runtime).
- **Play Compiled Preset Sfx** — play a preset by data symbol.
- **Stop Dynamic Sfx** — cut the sound immediately.

All play events have an optional *Wait Until Finished*.

Data symbols must be unique valid C identifiers (letters, digits,
underscores). The compile events generate `<symbol>.c/.h` in the build's
data folder; the play events resolve `_<symbol>` / `___bank_<symbol>` at
link time, so a typo in the symbol shows up as a linker error.

### How it integrates with the GBS engine

- The player runs from a VBL handler installed on first use (`add_VBL`),
  matching pokered's once-per-frame audio update. No stock engine files are
  overridden.
- While a dynamic sfx plays, hardware channels **1, 2 and 4** are taken from
  hUGEDriver using the engine's own mute-mask mechanism
  (`driver_set_mute_mask`), then handed back when the sound ends — music
  keeps playing on channel 3 (wave) during the sound and resumes fully
  afterwards.
- Compiled sound data lands in whatever ROM bank the packer picks; the
  player records the bank when playback starts and the VBL handler maps it
  around stream reads exactly like the engine's own sfx/music ISRs.
- GB Studio *Play Sound Effect* events write to the same channels and will
  fight a playing dynamic sfx (last writer wins) — same behaviour as two SFX
  in the original game. Avoid overlapping them if it matters.

### Caveats

- "Wait Until Finished" waits for all three channels to end (pokered's
  `WaitForSoundToFinish` waits only for pulse 1; the difference is at most a
  few frames).
- The final note's envelope tail rings out naturally unless music
  immediately retriggers the channel — also authentic.

---

## Example project

`DynamicSfxExample/` — open in GB Studio 4.3.0:

The example contains two scenes:

- **Pokered Sfx Data (compile only)** — never visited; its init script holds
  189 compile events recreating the complete Gen 1 sound set. Copy any of these events into your own project
  to take the sounds with you (byte-for-byte identical to the pokered data,
  except cry 02's fixed duty, which becomes an equivalent constant pattern).
- **Dynamic Sfx Demo** — plays five presets, a re-pitched base sound, and a
  small base sfx + preset authored from scratch (`demo_base_sfx`,
  `demo_preset_sfx`).

---

---

## Memory Footprint

Measured against the stock GB Studio **4.3.0-e1** engine (per-file SDCC compile with GB Studio's build flags, default engine settings). Values are the plugin's *delta* versus the stock engine; DMG build, with CGB noted where it differs. ROM cost lands in banked ROM (GB Studio's autobanker spreads it across switchable banks); using the plugin's events additionally compiles a few bytes of GBVM script per call into your project's script banks.

| | Cost |
|---|---|
| WRAM | +30 bytes |
| ROM | +1,315 bytes |

- **WRAM:** 30 bytes of synthesis/playback state.
- **ROM:** the 1.3 KiB is the synthesis engine only — every sound you author with the Compile Base/Preset Sfx events adds its own data bytes to ROM on top.
- **Engine WRAM headroom:** the stock GB Studio 4.3.0 engine leaves about **854 bytes** of WRAM free (usable engine WRAM is 7,776 bytes at 0xC0A0–0xDF00; the stock engine uses 6,922 bytes). With this plugin installed roughly **824 bytes** remain. This figure does not depend on how many global variables your project defines: the script memory array has a fixed size of VM_HEAP_SIZE + (VM_MAX_CONTEXTS × VM_CONTEXT_STACK_SIZE) words — 768 + 16 × 64 = 1,792 words (3,584 bytes) with stock engine settings.
- **SRAM:** not used.
