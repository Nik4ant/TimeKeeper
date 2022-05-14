module.exports = {
  content: [
      './**/*.html'
  ],
  theme: {
    extend: {
      // Stuff for animating gradient
      backgroundSize: {
        'size-200': '200% 200%',
      },
      backgroundPosition: {
        'pos-0': '0% 0%',
        'pos-100': '100% 100%',
      },
    },
  },
  plugins: []
}
