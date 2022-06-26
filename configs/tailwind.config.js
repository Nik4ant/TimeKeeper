module.exports = {
    content: [
      "./src/**/*.{html,css,tsx}"
    ],
    daisyui: {
        themes: ["light", "dark", "night", "forest"]
    },
    plugins: [
      require("daisyui")
    ],
}
