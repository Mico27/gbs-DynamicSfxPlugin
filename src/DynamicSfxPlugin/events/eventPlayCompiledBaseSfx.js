export const id = "EVENT_PLAY_COMPILED_BASE_SFX";
export const name = "Play Compiled Base Sfx";
export const groups = ["Dynamic Sfx"];

export const autoLabel = (fetchArg, input) => {
  return `Play Compiled Base Sfx (${input.data_symbol || "?"})`;
};

export const fields = [
  {
    key: "data_symbol",
    label: "Base Sfx Data Symbol",
    description:
      "Data symbol of a sound created with 'Compile Base Sfx Data'",
    type: "text",
    defaultValue: "my_base_sfx",
  },
  {
    key: "pitch",
    label: "Pitch (0-255)",
    description:
      "Added to the frequency of every note. 0 = the base sound as-is; higher values raise the pitch (also shifts the noise channel).",
    type: "value",
    min: 0,
    max: 255,
    width: "50%",
    defaultValue: {
      type: "number",
      value: 0,
    },
  },
  {
    key: "length",
    label: "Length (0-255)",
    description:
      "Note duration factor. 128 = normal speed, 0 = double speed (half length), 255 = about 1.5x longer.",
    type: "value",
    min: 0,
    max: 255,
    width: "50%",
    defaultValue: {
      type: "number",
      value: 128,
    },
  },
  {
    key: "wait",
    label: "Wait Until Finished",
    description: "Pause the script until the sound has finished playing",
    type: "checkbox",
    defaultValue: false,
  },
];

export const compile = (input, helpers) => {
  const { _addComment, _stackPushConst, _stackPushScriptValue, _callNative, _stackPop, _invoke } =
    helpers;
  _addComment("Play Compiled Base Sfx");
  // pushed pitch, length, addr, bank -> C reads FN_ARG0=bank ... FN_ARG3=pitch
  _stackPushScriptValue(input.pitch);
  _stackPushScriptValue(input.length);
  _stackPushConst(`_${input.data_symbol}`);
  _stackPushConst(`___bank_${input.data_symbol}`);
  _callNative("vm_dynsfx_play_data");
  _stackPop(4);
  if (input.wait) {
    _invoke("vm_dynsfx_wait", 0, ".ARG0");
  }
};
