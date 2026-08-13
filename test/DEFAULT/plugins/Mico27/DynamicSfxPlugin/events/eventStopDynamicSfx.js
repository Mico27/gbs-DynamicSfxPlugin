export const id = "EVENT_STOP_DYNAMIC_SFX";
export const name = "Stop Dynamic Sfx";
export const groups = ["Dynamic Sfx"];

export const fields = [
  {
    label:
      "Stops the currently playing dynamic sfx immediately and hands channels 1, 2 and 4 back to the music driver.",
  },
];

export const compile = (input, helpers) => {
  const { _addComment, _callNative } = helpers;
  _addComment("Stop Dynamic Sfx");
  _callNative("vm_dynsfx_stop");
};
