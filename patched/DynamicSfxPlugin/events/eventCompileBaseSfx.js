export const id = "EVENT_COMPILE_BASE_SFX";
export const name = "Compile Base Sfx Data";
export const groups = ["Dynamic Sfx"];

export const autoLabel = (fetchArg, input) => {
  return `Compile Base Sfx Data (${input.data_symbol || "?"})`;
};

const MAX_NOTES = 24;

const dutyOptions = [
  [0, "12.5%"],
  [1, "25%"],
  [2, "50%"],
  [3, "75%"],
];

const channelFields = (prefix, label, isNoise) => {
  const fields = [
    {
      type: "label",
      label: `--- ${label} ---`,
    },
    {
      key: `${prefix}NoteCount`,
      label: `${label} Notes`,
      description: `Number of notes on the ${label} channel (0 = channel silent)`,
      type: "number",
      min: 0,
      max: MAX_NOTES,
      defaultValue: 0,
    },
  ];
  if (!isNoise) {
    fields.push({
      type: "group",
      wrapItems: false,
      conditions: [{ key: `${prefix}NoteCount`, gt: 0 }],
      fields: [
        {
          key: `${prefix}DutyEnabled`,
          label: "Rotating Duty Pattern",
          description:
            "Rotate through the four duty cycles below, one step per frame (the classic Gen 1 shimmer). Off = plain 12.5% duty.",
          type: "checkbox",
          defaultValue: true,
        },
      ],
    });
    for (let d = 0; d < 4; d++) {
      fields.push({
        key: `${prefix}Duty${d}`,
        conditions: [
          { key: `${prefix}NoteCount`, gt: 0 },
          { key: `${prefix}DutyEnabled`, truthy: true },
        ],
        label: `Duty ${d + 1}`,
        type: "select",
        options: dutyOptions,
        width: "50%",
        defaultValue: d < 2 ? 3 : 1,
      });
    }
  }
  for (let i = 0; i < MAX_NOTES; i++) {
    if (!isNoise) {
      fields.push({
        type: "group",
        wrapItems: false,
        conditions: [{ key: `${prefix}NoteCount`, gt: i }],
        fields: [
          {
            key: `${prefix}SetDuty_${i}`,
            label: `${label} note ${i + 1}: Change Duty Pattern`,
            description:
              "Switch to a new rotating duty pattern from this note on",
            type: "checkbox",
            defaultValue: false,
          },
        ],
      });
      for (let d = 0; d < 4; d++) {
        fields.push({
          key: `${prefix}NoteDuty${d}_${i}`,
          conditions: [
            { key: `${prefix}NoteCount`, gt: i },
            { key: `${prefix}SetDuty_${i}`, truthy: true },
          ],
          label: `Duty ${d + 1}`,
          type: "select",
          options: dutyOptions,
          width: "50%",
          defaultValue: 2,
        });
      }
    }
    fields.push({
      type: "group",
      wrapItems: false,
      conditions: [{ key: `${prefix}NoteCount`, gt: i }],
      fields: [
        {
          key: `${prefix}Length_${i}`,
          label: `${label} note ${i + 1}: Length`,
          description: "Note length (0-15, in 16ths; +1 frame each)",
          type: "number",
          min: 0,
          max: 15,
          width: "50%",
          defaultValue: 8,
        },
        {
          key: `${prefix}Volume_${i}`,
          label: "Volume",
          description: "Starting volume (0-15)",
          type: "number",
          min: 0,
          max: 15,
          width: "50%",
          defaultValue: 15,
        },
        {
          key: `${prefix}Fade_${i}`,
          label: "Fade",
          description:
            "Envelope: positive fades out, negative fades in, 0 holds (bigger magnitude = slower)",
          type: "number",
          min: -7,
          max: 7,
          width: "50%",
          defaultValue: 1,
        },
        isNoise
          ? {
              key: `${prefix}Poly_${i}`,
              label: "Noise (0-255)",
              description:
                "Noise polynomial counter value (pitch/character of the noise)",
              type: "number",
              min: 0,
              max: 255,
              width: "50%",
              defaultValue: 44,
            }
          : {
              key: `${prefix}Freq_${i}`,
              label: "Freq (0-2047)",
              description:
                "Hardware frequency value (2048 - 131072/Hz); higher = higher pitch",
              type: "number",
              min: 0,
              max: 2047,
              width: "50%",
              defaultValue: 1750,
            },
      ],
    });
  }
  return fields;
};

export const fields = [].concat(
  [
    {
      label:
        "Compiles a base sound into ROM data at build time. Play it with 'Play Compiled Base Sfx' or reference it from 'Compile Preset Sfx Data' using the same data symbol. This event emits no runtime code - it just needs to exist in a script that gets compiled.",
    },
    {
      key: "data_symbol",
      label: "Data Symbol",
      description:
        "Unique C symbol name for this sound (letters, digits, underscores)",
      type: "text",
      defaultValue: "my_base_sfx",
    },
  ],
  channelFields("pulse1", "Pulse 1", false),
  channelFields("pulse2", "Pulse 2", false),
  channelFields("noise", "Noise", true)
);

const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

const buildStream = (input, prefix, isNoise) => {
  const bytes = [];
  const count = clamp(input[`${prefix}NoteCount`], 0, MAX_NOTES);
  if (count > 0 && !isNoise && input[`${prefix}DutyEnabled`]) {
    const pattern =
      (clamp(input[`${prefix}Duty0`], 0, 3) << 6) |
      (clamp(input[`${prefix}Duty1`], 0, 3) << 4) |
      (clamp(input[`${prefix}Duty2`], 0, 3) << 2) |
      clamp(input[`${prefix}Duty3`], 0, 3);
    bytes.push(0xfc, pattern);
  }
  for (let i = 0; i < count; i++) {
    if (!isNoise && input[`${prefix}SetDuty_${i}`]) {
      const pattern =
        (clamp(input[`${prefix}NoteDuty0_${i}`], 0, 3) << 6) |
        (clamp(input[`${prefix}NoteDuty1_${i}`], 0, 3) << 4) |
        (clamp(input[`${prefix}NoteDuty2_${i}`], 0, 3) << 2) |
        clamp(input[`${prefix}NoteDuty3_${i}`], 0, 3);
      bytes.push(0xfc, pattern);
    }
    const len = clamp(input[`${prefix}Length_${i}`], 0, 15);
    const vol = clamp(input[`${prefix}Volume_${i}`], 0, 15);
    const fade = clamp(input[`${prefix}Fade_${i}`], -7, 7);
    const fadeBits = fade < 0 ? 0x08 | -fade : fade;
    // volume 0 with no fade-in = rest: envelope 0x08 keeps the DAC powered
    // (silent) instead of cutting the channel, exactly like pokered's rests;
    // volume 0 with negative fade still means "fade in from silence"
    const envelope =
      vol === 0 && fade >= 0 ? 0x08 : ((vol << 4) | fadeBits) & 0xff;
    bytes.push(0x20 | len, envelope);
    if (isNoise) {
      bytes.push(clamp(input[`${prefix}Poly_${i}`], 0, 255));
    } else {
      const freq = clamp(input[`${prefix}Freq_${i}`], 0, 2047);
      bytes.push(freq & 0xff, (freq >> 8) & 0xff);
    }
  }
  bytes.push(0xff);
  return bytes;
};

const toHex = (bytes) =>
  bytes.map((b) => "0x" + b.toString(16).padStart(2, "0")).join(", ");

export const compile = (input, helpers) => {
  const { writeAsset, _getAvailableSymbol, _addComment } = helpers;

  const symbol = _getAvailableSymbol(input.data_symbol || "my_base_sfx");

  const pulse1 = buildStream(input, "pulse1", false);
  const pulse2 = buildStream(input, "pulse2", false);
  const noise = buildStream(input, "noise", true);

  _addComment(`Compile Base Sfx Data: ${symbol} (build-time only)`);

  writeAsset(
    `${symbol}.c`,
    `#pragma bank 255

// Generated by the Dynamic Sfx plugin "Compile Base Sfx Data" event.

#include "data/${symbol}.h"

BANKREF(${symbol})

static const uint8_t ${symbol}_pulse1[] = { ${toHex(pulse1)} };
static const uint8_t ${symbol}_pulse2[] = { ${toHex(pulse2)} };
static const uint8_t ${symbol}_noise[]  = { ${toHex(noise)} };

const dynsfx_base_t ${symbol} = { ${symbol}_pulse1, ${symbol}_pulse2, ${symbol}_noise };
`
  );

  writeAsset(
    `${symbol}.h`,
    `#ifndef __${symbol}_INCLUDE__
#define __${symbol}_INCLUDE__

#include "dynamic_sfx_player.h"

BANKREF_EXTERN(${symbol})
extern const dynsfx_base_t ${symbol};

#endif
`
  );
};
