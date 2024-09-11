// Generated via: https://components.ai/theme/siUNxkSEcDHRJdA7cjMv
// Interpolated via: https://colordesigner.io/gradient-generator (5 steps)
export const CARD_BACKGROUNDS = [
  "#f7f1ff",
  "#f9f1ff",
  "#faf1ff",
  "#fcf0ff",

  "#fef0ff",
  "#fef0ff",
  "#feefff",
  "#ffeffe",

  "#ffeefe",
  "#ffeefa",
  "#ffeef6",
  "#ffeff3",

  "#fff0f1",
  "#fff0ef",
  "#fff0ed",
  "#fff0eb",

  "#fff0e9",
  "#fff2e6",
  "#fff4e3",
  "#fff7e0",

  "#fffade",
  "#fffbd9",
  "#fffcd5",
  "#fffed0",

  "#ffffcc",
  "#feffd3",
  "#fdffd9",
  "#fcfee0",

  "#fcfee6",
  "#f7fde9",
  "#f3fbeb",
  "#f0f9ed",

  "#eef7ef",
  "#edf7f2",
  "#ecf7f4",
  "#edf7f6",
  "#eef6f7",
];

export function pickColorForText(text, colors) {
  if (!text) {
    return colors[0];
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  return colors[Math.abs(hash % (colors.length - 1))];
}
