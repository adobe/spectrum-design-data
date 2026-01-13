const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const SOURCEMAPTYPE = 'inline-nosources-source-map'; // or 'inline-source-map'

module.exports = (env, argv) => ({
    target: 'node',
    mode: argv.mode === 'production' ? 'production' : 'development',
    devtool: argv.mode === 'production' ? false : SOURCEMAPTYPE,

    entry: {
        plugin: './src/plugin/plugin.ts', // The entry point for your plugin code
        ui: './src/ui/ui.ts' // The entry point for your UI code
    },

    module: {
        rules: [
            {
                // typescript support
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: [/node_modules/, /\.test\.ts$/]
            },
            {
                // source map support
                test: /\.js$/,
                use: 'source-map-loader',
                enforce: 'pre',
                exclude: /node_modules/
            },
            {
                // css support
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                // svg support
                test: /\.svg/,
                type: 'asset/inline'
            }
        ]
    },
    resolve: {
        // our supported source file types
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: (pathData) => {
            if (pathData.chunk.name === 'plugin') {
                return 'plugin.js';
            } else if (pathData.chunk.name === 'ui') {
                return 'ui.js';
            }
        },
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/',
        clean: false
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: 'body',
            template: './src/ui/ui.html',
            filename: 'ui.html',
            chunks: ['ui'],
            publicPath: '/',
            cache: false
        })
    ]
});
