const path = require("path");

module.exports = {
    plugins: [
        require("postcss-import"),
        // It's already using root directory so this: "tailwind.config.js" won't work
        require("tailwindcss")(path.resolve("configs", "tailwind.config.js")),
        require("autoprefixer"),
    ]
}