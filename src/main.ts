import axios from 'axios';
import { diffNums, prTag, toBase64 } from './helper.js';
import { DiffStat } from './types/DiffStat.js';
import { PullRequestCommentsResponse } from './types/PullRequestComments.js';
import { PullRequestResponse } from './types/UserPullRequestResponse.js';
import { UserResponse } from './types/UserResponse.js';

const userName = 'ruairicaldwell';
const appPassword = '';
axios.defaults.headers.common['Authorization'] = `Basic ${toBase64(`${userName}:${appPassword}`)}`;

async function getPullRequest() {
    const response = await axios.get(
        `https://api.bitbucket.org/2.0/repositories/esosolutions/Internal Tools v2/pullrequests/848` // doesn't work because space
    );
    return response.data;
}

async function makeGenericRequest(url: string) {
    const response = await axios.get(url);
    return response.data;
}

async function getMergedPullRequestsForUser(userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/pullrequests/${userId}?q=state="MERGED" AND created_on > 2022-11-01T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;
    await getPullRequestPage(initialRequest);
}

async function getPullRequestPage(url: string) {
    const response = await axios.get<PullRequestResponse>(url);

    console.log(
        `retrieved page ${response.data.page}/${Math.ceil(
            response.data.size / response.data.pagelen
        )} (total pull requests = ${response.data.size})`
    );

    for (const pr of response.data.values) {
        console.log(pr.destination.repository.uuid, pr.destination.repository.name);
        myPrs.push({ id: pr.id, repoId: pr.destination.repository.uuid });
        if (!sums.has(pr.destination.repository.name)) {
            sums.set(pr.destination.repository.name, 1);
        } else {
            sums.set(pr.destination.repository.name, sums.get(pr.destination.repository.name) + 1); // TODO ternary
        }
    }

    if (response.data.next) {
        await getPullRequestPage(response.data.next);
    }
}

async function getPullRequestComments(url: string) {
    const response = await axios.get<PullRequestCommentsResponse>(url);

    for (const comment of response.data.values) {
        if (userId.includes(comment.user.uuid)) {
            totalComments += 1;
        }
    }

    if (response.data.next) {
        await getPullRequestComments(response.data.next);
    }
}
async function getAllPullRequestsForRepoNotMine(repoId: string, userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-01T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;
    await getPullRequestComments(initialRequest);
}

async function goThroughPullRequestsForComments(url: string, userId: string) {
    const response = await axios.get<PullRequestResponse>(url);

    for (const pr of response.data.values) {
        await getPullRequestComments(
            `https://api.bitbucket.org/2.0/repositories/esosolutions/${pr.destination.repository.uuid}/pullrequests/${pr.id}/comments`
        );
    }

    if (response.data.next) {
        await goThroughPullRequestsForComments(response.data.next, userId);
    }
}

async function getDiffStatForPr(prId: number, repoId: string): Promise<diffNums> {
    const url = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests/${prId}/diffstat`;
    console.log('diff stat for', prId, repoId);
    const response = await axios.get<DiffStat>(url);
    let added = 0;
    let removed = 0;

    for (const file of response.data.values) {
        added += file.lines_added;
        removed += file.lines_removed;
    }

    // this has pagination but has size of 500 files per page so probably unneeded
    const diffTotal: diffNums = { linesAdded: added, linesRemoved: removed };
    return diffTotal;
}

async function getCurrentUserId() {
    const response = await axios.get<UserResponse>(`https://api.bitbucket.org/2.0/user`);
    return response.data.uuid;
}
console.time();
let totalComments = 0;
const sums = new Map<string, number>();
// key  = repo name - PR Id
const userId = await getCurrentUserId(); // [await getCurrentUserId()]; // can add uuid's of previous bitbucket account to this array (have to get them out of dev tools of old pull requests).
const myPrs: prTag[] = [];
await getMergedPullRequestsForUser(userId);

console.log(sums);
const totalMergedPRs = [...sums.values()].reduce((a, b) => a + b, 0);
console.log('total pull requests:', totalMergedPRs);

const promises: Promise<diffNums>[] = [];
for (const pullreq of myPrs) {
    promises.push(getDiffStatForPr(pullreq.id, pullreq.repoId));
}

const diffs = await Promise.all(promises);
const totalLinesAdded = diffs.reduce((a, b) => a + b.linesAdded, 0);
const totalLinesRemoved = diffs.reduce((a, b) => a + b.linesRemoved, 0);
console.log('total lines added:', totalLinesAdded);
console.log('total lines removed:', totalLinesRemoved);
console.timeEnd();
