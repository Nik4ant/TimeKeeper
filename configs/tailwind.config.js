module.exports = {
    content: [
      "./src/**/*.{html,css,tsx}"
    ],
    daisyui: {
        themes: ["light", "dark", "night"]
    },
    plugins: [
      require("daisyui")
    ],
}
