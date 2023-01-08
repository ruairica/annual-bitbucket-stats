# node-ts-template

A template project for developing node.js (ensure you have atleast node v18.X installed) projects with Typescript (this project uses ts v4.9). Configured with ESLint and Prettier for linting and formatting. Example Typescript files can be found in the `/src` directory.

## Getting started

-   Open the project in VS Code, you should be prompted to install the recommended extensions (Prettier and ESLint). If you this doesn't appear open the command pallet `ctrl + shift + p` and type `Show Recommended Extensions` to install the extensions. It's recommended to also change your VS Code settings to configure Prettier to format file on save.
-   Run `npm install` in in the terminal to install dependencies
-   Run `npm run build` in the terminal to build the project with the Typescript compiler. The javascript files will be created in the `/dist` folder.
-   `main.js` in the `/dist` folder is the entry point of the program. It can be run with `node main.js`
