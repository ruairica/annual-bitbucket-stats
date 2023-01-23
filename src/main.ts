import { bitbucketService } from './bitbucketservice.js';

const asyncLimit = 100; // number of promises that will be resolved at once
const userName = 'ruairicaldwell';
const appPassword = '';
const workSpace = 'esosolutions';
const mainBranches = ['develop', 'development', 'main', 'release']; // will check for pull requests being merged into these branches (uses startsWith for comparison)
const year = 2022;

const service = new bitbucketService(
    userName,
    appPassword,
    workSpace,
    year,
    mainBranches,
    asyncLimit
);
await service.setup();
service.output();
