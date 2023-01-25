import { bitbucketService } from './bitbucketService.js';

const asyncLimit = 100; // number of promises that will be resolved at once
const userName = '';
const appPassword = '';
const workSpace = '';
const mainBranches = ['develop', 'development', 'main', 'release']; // will check for pull requests being merged into these branches (uses startsWith for comparison, so any branch name that starts with 'release' will be counted)
const year = 2022;

const service = new bitbucketService(
    userName,
    appPassword,
    workSpace,
    year,
    mainBranches,
    asyncLimit
);

await service.run();
service.printOutput();
