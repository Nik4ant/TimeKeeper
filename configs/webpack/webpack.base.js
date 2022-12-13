const path = require("path");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const projectRoot = path.resolve(__dirname, "..", "..")

module.exports = {
    experiments: {
        topLevelAwait: true,
    },
    entry: {
        background: {
            import: path.resolve(projectRoot, "src", "background.ts"), filename: "./[name].js"
        },
        popup: {
            import: path.resolve(projectRoot, "src", "pages", "popup", "popup.tsx"), filename: "[name]/[name].js"
        },
        // taboo: path.resolve(projectRoot, "src", "static", "TabooPage", "taboo.tsx"),
    },
    resolve: {
        extensions: [".ts", ".js", ".tsx", ".tsx"],
    },
    output: {
        path: path.resolve(projectRoot, "dist"),
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                "babel-preset-solid",
                                "@babel/preset-env",
                                "@babel/preset-typescript"
                            ],
                            plugins: ["@babel/plugin-transform-runtime"],
                        }
                    }
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        // This is used to make everything work with custom config path
                        options: {
                            importLoaders: 1
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                config: path.resolve(projectRoot, "configs", "postcss.config.js")
                            },
                        }
                    },
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name]/[name].css",
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "./src/pages",
                    // Copying all files except for files that are processed using loaders
                    // Note: This might be a bad decision, but I don't want to
                    // keep pages content separately because of .html files
                    filter: (resourcePath) => {
                        const extensionsToFilter = ["ts", "js", "tsx", "jsx", "css"];
                        const fileExt = path.extname(resourcePath).replace('.', '');
                        return extensionsToFilter.indexOf(fileExt) === -1;
                    }
                },
                {
                    from: "public/"
                }
            ],
        }),
    ],
}