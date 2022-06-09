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
      colors: {
        primary: {
          light: hexToRGBA("#006397"),
          dark: hexToRGBA("#93ccff"),
        },
        secondary: {
          light: hexToRGBA("#51606f"),
          dark: hexToRGBA("#b8c8da"),
        },
        tertiary: {
          light: hexToRGBA("#67587a"),
          dark: hexToRGBA("#d1bfe7"),
        },
        error: {
          light: hexToRGBA("#ba1a1a"),
          dark: hexToRGBA("#ffb4ab"),
        },
        background: {
          light: hexToRGBA("#fcfcff"),
          dark: hexToRGBA("#1a1c1e"),
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
