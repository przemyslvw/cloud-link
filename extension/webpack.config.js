const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: 'production',
    entry: {
        background: './background.ts',
        'content-script': './content-script.ts',
        popup: './popup.ts',
        styles: './styles.scss',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader'
                ],
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "manifest.json", to: "." },
                { from: "popup.html", to: "." },
                { from: "assets", to: "assets" },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.css', // Or [name].css if we want per-entry styles
        }),
    ],
};
