import { bitbucketStatsService } from './bitbucketStatsService.js';
import { quarter } from './serviceTypes.js';

const asyncLimit = 100; // number of promises that will be resolved at once
const userName = '';
const appPassword = '';
const workSpace = '';
const mainBranches = ['develop', 'development', 'main', 'release']; // will check for pull requests being merged into these branches (uses startsWith for comparison, so any branch name that starts with 'release' will be counted)
const year = 2023;
const quarter: quarter = 'Q2'; // set to null to get stats for the entire year

const service = new bitbucketStatsService(
    userName,
    appPassword,
    workSpace,
    year,
    quarter,
    mainBranches,
    asyncLimit
);

await service.getStats();
service.printStats();
