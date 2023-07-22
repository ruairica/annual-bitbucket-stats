## Your annual statistics from Bitbucket

Displays useful information about pull requests you have made as well as pull requests you reviewed.

### Getting started

1. Clone project
2. run `npm install`
3. Open `main.ts`
    1. On line 5 insert your Bitbucket username (can be located on [this](https://bitbucket.org/account/settings/) page)
    2. On line 6 insert an app password (view/create app passwords [here](https://bitbucket.org/account/settings/app-passwords/))
    3. On line 7 insert your work space name
    4. On line 8 insert the branches which you care about merges into, these are compared by startsWith, eg. inserting `release` will check for pull requests to any branch that starts with the word `release`
    5. On line 9 insert the year you want to get the statistics for
    6. On line 10 set the quarter eg 'Q2' you want to get statistics for (set to null to get annual statistics)
4. run `npm run build`
5. cd into the `dist` folder and run `node main.js`

TODO:
-   Rename repo to reflect the fact it is quarterly and annual stats
-   Add error handling
-   Use [partial responses](https://developer.atlassian.com/cloud/bitbucket/rest/intro/#partial-response) to get the bitbucket api to send back only the values needed
-   Make this a package runnable from the command line.
