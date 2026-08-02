# gbs-DynamicSfxPlugin

**Version 1.0.0 — Requires GB Studio ≥ 4.3.0**

Real-time, parameter-driven sound synthesis for GB Studio, replicating how Pokémon Red/Blue generated all 151 cries on the Game Boy's sound hardware.

No audio files are involved: every sound is synthesised at runtime from a few bytes of hardware instructions, exactly like the original game. All sound data is authored in the IDE with the plugin's *Compile* events — the plugin itself ships no built-in sounds. The example project includes the complete Gen 1 data (38 base sounds, 151 presets) recreated with those events.

https://github.com/user-attachments/assets/6b1db76f-c14a-45a6-bbf9-87990330bf88

---

## Table of Contents

1. [Concepts](#concepts)
2. [Project Setup](#project-setup)
3. [Size Limits and Restrictions](#size-limits-and-restrictions)
4. [Events Reference](#events-reference)
5. [Memory Footprint](#memory-footprint)

---

## Concepts

### Base sounds and presets

The technique this plugin reproduces stores only a small set of **base sounds** and derives many variations from them. A **preset** is a base sound plus two modifiers:

- **Pitch modifier** — added to the frequency of *every* note on both pulse channels, and to the noise channel, so noise shifts pitch too.
- **Length modifier** — scales every note's duration. The midpoint is normal speed; the lowest value is double speed and the highest is roughly 1.5× longer.

In the original game, 38 base sounds plus these two modifier bytes produced all 151 cries. The same trick lets a handful of sounds cover a whole game's worth of variation.

### What a base sound contains

A base sound is three note streams played simultaneously on two pulse channels and the noise channel. Each note carries a length, a volume, a fade (negative fades in) and a frequency — or a noise polynomial value for the noise channel.

Pulse channels can also enable a **rotating 4-step duty pattern**, which rotates every frame while a note sounds. That per-frame duty animation is a large part of the classic Gen 1 timbre, and any note can switch to a new duty pattern mid-sound.

A volume-0 note acts as a rest.

### Authoring vs. playing

The two **Compile** events turn IDE input into ROM data when the project is built. They emit no runtime code — drop them in any script that gets compiled, even a scene that is never visited, and the data exists in the ROM. The **Play** events then reference that data by its symbol.

<img width="572" height="1261" alt="image" src="https://github.com/user-attachments/assets/8aa47161-632a-4cb7-8144-4d0fb5a95ffa" />

---

## Project Setup

### 1. Author a base sound

Add a **Compile Base Sfx Data** event to any script that gets compiled — a scene's On Init works well, including a scene you never visit. Give the sound a unique **Data Symbol**, then author its notes across the three channels.

### 2. Author presets (optional)

Add **Compile Preset Sfx Data** events to package a base sound with a pitch and length into a named preset, referencing the base sound by its data symbol.

### 3. Play

Use **Play Compiled Base Sfx** or **Play Compiled Preset Sfx** wherever the sound should fire, referencing the data symbol. Pitch and length on the base-sound play event are script values, so one sound can be re-pitched endlessly at runtime.

<img width="575" height="213" alt="image" src="https://github.com/user-attachments/assets/39f6d581-934c-4106-ad98-76f4ddc8bed3" />

---

## Size Limits and Restrictions

- **Up to 24 notes per channel** in a base sound. Channels with 0 notes stay silent.
- **Data symbols must be unique, valid C identifiers** — letters, digits and underscores. A typo in a symbol shows up as a build error rather than a silent failure.
- **Channels 1, 2 and 4 are taken over** while a dynamic sfx plays, and handed back when it ends. Music keeps playing on channel 3 throughout and resumes fully afterwards.
- **GB Studio's own Play Sound Effect events write to the same channels** and will fight a playing dynamic sfx — last writer wins, the same behaviour as two overlapping SFX in the original game. Avoid overlapping them where it matters.
- **Wait Until Finished waits for all three channels** to end. The original game waited only for the first pulse channel; the difference is at most a few frames.
- **The final note's envelope tail rings out naturally** unless music immediately retriggers the channel — also authentic.
- No stock engine files are overridden, so the plugin is compatible with any other plugin.

---

## Events Reference

---

### Compile Base Sfx Data

Authors a base sound and compiles it into ROM data. Emits no runtime code.

| Field | Description |
|-------|-------------|
| Data Symbol | Unique identifier for this sound, used by the play events. Letters, digits and underscores only. |
| Notes (pulse 1 / pulse 2 / noise) | Up to 24 notes per channel. Each note has a length, volume, fade (negative = fade in) and frequency, or a polynomial value on the noise channel. |
| Duty pattern | Enables the rotating 4-step duty pattern on a pulse channel. Any note can switch to a new pattern mid-sound. |

---

### Compile Preset Sfx Data

Packages a base sound with a pitch and length modifier as a named preset, and compiles it into ROM data. Emits no runtime code.

| Field | Description |
|-------|-------------|
| Data Symbol | Unique identifier for this preset. |
| Base Sfx Symbol | The data symbol of the base sound this preset is built from. |
| Pitch | Added to the frequency of every note, and to the noise channel. |
| Length | Scales every note's duration. |

---

### Play Compiled Base Sfx

Plays a base sound by data symbol, with pitch and length supplied at runtime.

| Field | Description |
|-------|-------------|
| Data Symbol | The base sound to play. |
| Pitch | Pitch modifier — a value, variable or expression. |
| Length | Length modifier — a value, variable or expression. |
| Wait Until Finished | Block the script until all three channels have finished. |

---

### Play Compiled Preset Sfx

Plays a preset by data symbol.

| Field | Description |
|-------|-------------|
| Data Symbol | The preset to play. |
| Wait Until Finished | Block the script until all three channels have finished. |

---

### Stop Dynamic Sfx

Cuts the currently playing sound immediately. No fields.

---

## Media

`DynamicSfxExample/` contains two scenes:

- **Pokered Sfx Data (compile only)** — never visited; its init script holds 189 compile events recreating the complete Gen 1 sound set. Copy any of these events into your own project to take the sounds with you.
- **Dynamic Sfx Demo** — plays five presets, a re-pitched base sound, and a small base sound and preset authored from scratch.

---

## Memory Footprint

Measured against the stock GB Studio **4.3.0-e1** engine (per-file SDCC compile with GB Studio's build flags, default engine settings). Values are the plugin's *delta* versus the stock engine; DMG build, with CGB noted where it differs. ROM cost lands in banked ROM (GB Studio's autobanker spreads it across switchable banks); using the plugin's events additionally compiles a few bytes of GBVM script per call into your project's script banks.

| | Cost |
|---|---|
| WRAM | +34 bytes |
| ROM (bank 0) | +46 bytes |
| ROM (banked) | +1,261 bytes |

- **WRAM:** 34 bytes of synthesis and playback state.
- **ROM:** the 1.3 KiB is the synthesis engine only — every sound you author with the Compile events adds its own data bytes to ROM on top.
- **Bank 0:** only 46 bytes are resident; everything else is in a switchable bank. See [Bank 0 (HOME) Usage](#bank-0-home-usage).
- **Engine WRAM headroom:** the stock GB Studio 4.3.0 engine leaves about **854 bytes** of WRAM free (usable engine WRAM is 7,776 bytes at 0xC0A0–0xDF00; the stock engine uses 6,922 bytes). With this plugin installed roughly **824 bytes** remain. This figure does not depend on how many global variables your project defines: the script memory array has a fixed size of VM_HEAP_SIZE + (VM_MAX_CONTEXTS × VM_CONTEXT_STACK_SIZE) words — 768 + 16 × 64 = 1,792 words (3,584 bytes) with stock engine settings.
- **SRAM:** not used.

---

<!-- BANK0:BEGIN -->
## Bank 0 (HOME) Usage

Bank 0 is the 16 KB non-switchable ROM bank that the GB Studio engine core,
the interrupt handlers and the GBDK runtime all share. Banked ROM is cheap
(add another bank), bank 0 is not, so it is usually the first thing a project
runs out of.

| | Bytes |
|---|---|
| Bank 0 used by this plugin | **+46** |
| Bank 0 free with this plugin installed | **1,405** of 16,384 (91% used) |

Everything else this plugin adds lives in banked ROM.

| Module | This plugin | Stock engine | Bank 0 cost |
|---|---|---|---|
| `dynamic_sfx_player.c` | 46 | — | +46 |

<details><summary>How this was measured</summary>

GB Studio 4.3.2, DMG target, default engine settings. Each module's bank 0
contribution is the `A _HOME size` record that SDCC writes into its `.rel`
object, summed over the engine sources this plugin provides. Stock sizes come
from building projects whose only plugin ships no engine C, so every module in
them is the untouched engine; two such builds were compared and agreed on all
73 shared modules.

The "free" figure is a stock project with this plugin and nothing else. Your
own number will differ: other plugins, and any engine settings that change what
the core compiles, move it independently of this plugin.

</details>
<!-- BANK0:END -->
