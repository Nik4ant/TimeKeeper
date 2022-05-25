const path = require("path");
const cssnano = require("cssnano");
const isProductionMode = process.env.NODE_ENV === "production";

module.exports = {
    plugins: [
        require("postcss-import"),
        // It's already using root directory so this: "tailwind.config.js" won't work
        require("tailwindcss")(path.resolve("configs", "tailwind.config.js")),
        require("autoprefixer"),
        // Minify for production
        ...(isProductionMode
            ? [
                cssnano({
                    preset: [
                        "advanced",
                        {"discardComments": {"removeAll": true}}
                    ]
                }),
            ]
            : []),
    ]
}