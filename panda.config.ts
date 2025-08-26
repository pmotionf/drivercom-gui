import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import indigo from "@park-ui/panda-preset/colors/indigo";
import slate from "@park-ui/panda-preset/colors/slate";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  presets: [
    "@pandacss/preset-base",
    createPreset({
      accentColor: indigo,
      grayColor: slate,
      radius: "md",
    }),
  ],

  // Necessary for light/dark mode detection
  conditions: {
    extend: {
      dark: '.dark &, [data-theme="dark"] &',
      light: '.light &, [data-theme="light"] &',
    },
  },

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  jsxFramework: "solid",

  // Useful for theme customization
  theme: {
    extend: {
      semanticTokens: {
        colors: {
          accent: {
            1: { value: { base: "#fdfdfe", _dark: "#0b111a" } },
            2: { value: { base: "#f7f9ff", _dark: "#121a25" } },
            3: { value: { base: "#edf2fe", _dark: "#17273e" } },
            4: { value: { base: "#dfeaff", _dark: "#1e3453" } },
            5: { value: { base: "#d0dfff", _dark: "#274165" } },
            6: { value: { base: "#bdd1ff", _dark: "#334f79" } },
            7: { value: { base: "#a6bff9", _dark: "#3f6091" } },
            8: { value: { base: "#87a5ef", _dark: "#4c74ae" } },
            9: { value: { base: "#3d63dd", _dark: "#5b84bf" } },
            10: { value: { base: "#3657c3", _dark: "#4f77b1" } },
            11: { value: { base: "#395bc7", _dark: "#98bdf4" } },
            12: { value: { base: "#1d2e5c", _dark: "#d6ebff" } },
            a1: { value: { base: "#00008002", _dark: "#0012f70a" } },
            a2: { value: { base: "#0040ff08", _dark: "#1c79f916" } },
            a3: { value: { base: "#0047f112", _dark: "#3184fc31" } },
            a4: { value: { base: "#0058ff20", _dark: "#408fff47" } },
            a5: { value: { base: "#0052ff2f", _dark: "#5099ff5a" } },
            a6: { value: { base: "#004eff42", _dark: "#5e9efd70" } },
            a7: { value: { base: "#0048ee59", _dark: "#66a3fe8a" } },
            a8: { value: { base: "#0040dd78", _dark: "#6aa6fea9" } },
            a9: { value: { base: "#0032d2c2", _dark: "#75adfebb" } },
            a10: { value: { base: "#002ab3c9", _dark: "#6ca8feac" } },
            a11: { value: { base: "#002cb7c6", _dark: "#9ec4fef4" } },
            a12: { value: { base: "#001347e2", _dark: "#d6ebff" } },
            default: {
              value: {
                _light: "{colors.accent.9}",
                _dark: "{colors.accent.9}",
              },
            },
            emphasized: {
              value: {
                _light: "{colors.accent.10}",
                _dark: "{colors.accent.10}",
              },
            },
            fg: { value: { _light: "white", _dark: "white" } },
            text: {
              value: {
                _light: "{colors.accent.a11}",
                _dark: "{colors.accent.a11}",
              },
            },
            customGreen: {
              value: {
                _light: "#a8dcab",
                _dark: "#0f6b4c",
              },
            },
            customRed: {
              value: {
                _light: "#fdc8c8",
                _dark: "#bd2f31",
              },
            },
            customOrange: {
              value: {
                _light: "#F7ce82",
                _dark: "#b4820F",
              },
            },
          },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
