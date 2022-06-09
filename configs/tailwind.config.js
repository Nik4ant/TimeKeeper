function hexToRGBA(hex, alpha=1 ) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


module.exports = {
  content: [
      "./src/**/*.{html,css,tsx}"
  ],
  theme: {
    extend: {
      // Note: Changing colors for dark mode is handled by JS (not here)
      colors: {
        primary: {
          on: {
            light: hexToRGBA("#ffffff"),
            dark: hexToRGBA("#381e72"),
          },
          light: hexToRGBA("#006397"),
          dark: hexToRGBA("#93ccff"),
        },
        secondary: {
          on: {
            light: hexToRGBA("#ffffff"),
            dark: hexToRGBA("#332d41"),
          },
          light: hexToRGBA("#51606f"),
          dark: hexToRGBA("#b8c8da"),
        },
        tertiary: {
          on: {
            light: hexToRGBA("#ffffff"),
            dark: hexToRGBA("#4a2532"),
          },
          light: hexToRGBA("#67587a"),
          dark: hexToRGBA("#d1bfe7"),
        },
        error: {
          on: {
            light: hexToRGBA("#ffffff"),
            dark: hexToRGBA("#690005"),
          },
          light: hexToRGBA("#ba1a1a"),
          dark: hexToRGBA("#ffb4ab"),
        },
        background: {
          on: {
            light: hexToRGBA("#1c1b1e"),
            dark: hexToRGBA("#e6e1e6"),
          },
          light: hexToRGBA("#fcfcff"),
          dark: hexToRGBA("#1a1c1e"),
        },
        surface: {
          on: {
            light: hexToRGBA("#1c1b1e"),
            dark: hexToRGBA("#e6e1e6"),
          },
          light: hexToRGBA("#e7e0eb"),
          dark: hexToRGBA("#49454e"),
        },
        outline: {
          light: hexToRGBA("#72787e"),
          dark: hexToRGBA("#8c9198"),
        },
      },
    }
  },
  plugins: [],
}
