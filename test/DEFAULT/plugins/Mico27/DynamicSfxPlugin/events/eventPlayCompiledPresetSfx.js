export const id = "EVENT_PLAY_COMPILED_PRESET_SFX";
export const name = "Play Compiled Preset Sfx";
export const groups = ["Dynamic Sfx"];

export const autoLabel = (fetchArg, input) => {
  return `Play Compiled Preset Sfx (${input.data_symbol || "?"})`;
};

export const fields = [
  {
    key: "data_symbol",
    label: "Preset Sfx Data Symbol",
    description:
      "Data symbol of a preset created with 'Compile Preset Sfx Data'",
    type: "text",
    defaultValue: "my_preset_sfx",
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
  const { _addComment, _stackPushConst, _callNative, _stackPop, _invoke } =
    helpers;
  _addComment("Play Compiled Preset Sfx");
  // pushed addr, bank -> C reads FN_ARG0=bank, FN_ARG1=addr
  _stackPushConst(`_${input.data_symbol}`);
  _stackPushConst(`___bank_${input.data_symbol}`);
  _callNative("vm_dynsfx_play_preset_data");
  _stackPop(2);
  if (input.wait) {
    _invoke("vm_dynsfx_wait", 0, ".ARG0");
  }
};
