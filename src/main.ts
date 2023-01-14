import axios from 'axios';
import pLimit from 'p-limit';
import { diffNums, prTag, toBase64 } from './helper.js';
import { DiffStat } from './types/DiffStat.js';
import { PullRequestCommentsResponse } from './types/PullRequestComments.js';
import { PullRequestResponse } from './types/UserPullRequestResponse.js';
import { UserResponse } from './types/UserResponse.js';

const limit = pLimit(15);
const userName = 'ruairicaldwell';
const appPassword = '';
axios.defaults.headers.common['Authorization'] = `Basic ${toBase64(`${userName}:${appPassword}`)}`;

async function AsyncgetAllPullRequestsForRepoNotMine(repoId: string, userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-20T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;
    const prs = await getAllPaginatedValuesPr(initialRequest);
}

async function getAllPaginatedValuesPr(url: string) {
    const initialRequest = url;
    const responseData: PullRequestResponse[] = [];
    const response = await axios.get<PullRequestResponse>(initialRequest);
    responseData.push(response.data);

    const promiseArray = [];
    const totalTrips = response.data.size;
    const totalPages = Math.ceil(totalTrips / response.data.pagelen);
    console.log(
        'pagelen',
        response.data.pagelen,
        'size',
        response.data.size,
        'total pages',
        totalPages
    );
    for (let i = 2; i <= totalPages; i++) {
        promiseArray.push(
            limit(() => axios.get<PullRequestResponse>(`${initialRequest}&page=${i}`))
        );
    }
    const resolvedPromises = await Promise.all(promiseArray);
    console.log('requests made', resolvedPromises.length + 1);
    responseData.push(...resolvedPromises.map((x) => x.data));
    console.log('allPullRequestsResponses', responseData.length);

    const values = responseData.flatMap((x) => x.values);

    return values;
}

async function getAllPullRequestsForRepoNotMine(repoId: string, userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-20T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;

    let commentResponsePromises = [];
    for (const pr of await getAllPaginatedValuesPr(initialRequest)) {
        // have pull requests, for each one get paginated comments
        commentResponsePromises.push(
            limit(() =>
                getPrComments(
                    `https://api.bitbucket.org/2.0/repositories/esosolutions/${pr.destination.repository.uuid}/pullrequests/${pr.id}/comments`
                )
            )
        );
    }

    let commentResponses = await Promise.all(commentResponsePromises);
    const comments = commentResponses.flatMap((x) => x.values);

    let nexts = commentResponses.filter((x) => x.next).map((x) => x.next);
    while (nexts.length > 0) {
        commentResponsePromises = [];
        commentResponses = [];

        for (const next of nexts) {
            commentResponsePromises.push(limit(() => getPrComments(next)));
        }

        commentResponses = await Promise.all(commentResponsePromises);
        comments.push(...commentResponses.flatMap((x) => x.values));
        nexts = commentResponses.filter((x) => x.next).map((x) => x.next);
    }

    return comments;
}

async function getPrComments(url: string) {
    const response = await axios.get<PullRequestCommentsResponse>(url);
    return response.data;
}

async function getPullRequestComments(url: string) {
    const response = await axios.get<PullRequestCommentsResponse>(url);
    for (const comment of response.data.values) {
        if (userId === comment.user.uuid) {
            console.log(url);
            // totalComments += 1;
        }
    }

    if (response.data.next) {
        await getPullRequestComments(response.data.next);
    }
}

async function goThroughPullRequestsForComments(url: string, userId: string) {
    const response = await axios.get<PullRequestResponse>(url);
    for (const pr of response.data.values) {
        await getPullRequestComments(
            `https://api.bitbucket.org/2.0/repositories/esosolutions/${pr.destination.repository.uuid}/pullrequests/${pr.id}/comments`
        );
    }

    if (response.data.next) {
        console.log(response.data.next);
        await goThroughPullRequestsForComments(response.data.next, userId);
    }
}
async function getDiffStatForPr(prId: number, repoId: string): Promise<diffNums> {
    const url = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests/${prId}/diffstat`;
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
const sums = new Map<string, number>();
const userId = await getCurrentUserId(); // [await getCurrentUserId()]; // can add uuid's of previous bitbucket account to this array (have to get them out of dev tools of old pull requests).
const myPrs: prTag[] = [];

for (const pr of await getAllPaginatedValuesPr(
    `https://api.bitbucket.org/2.0/pullrequests/${userId}?q=state="MERGED" AND created_on > 2022-11-01T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`
)) {
    if (
        pr.destination.branch.name == 'develop' ||
        pr.destination.branch.name == 'main' ||
        pr.destination.branch.name.startsWith('release')
    ) {
        myPrs.push({ id: pr.id, repoId: pr.destination.repository.uuid });
    }
    if (!sums.has(pr.destination.repository.name)) {
        sums.set(pr.destination.repository.name, 1);
    } else {
        sums.set(pr.destination.repository.name, sums.get(pr.destination.repository.name) + 1); // TODO ternary
    }
}

console.log(sums);
const totalMergedPRs = [...sums.values()].reduce((a, b) => a + b, 0);
console.log('total pull requests:', totalMergedPRs);
console.log(myPrs);
// diff stats
console.log(myPrs[myPrs.length - 1].id, myPrs[myPrs.length - 1].repoId);
const diffPromises: Promise<diffNums>[] = [];
for (const pullreq of myPrs) {
    console.log(pullreq.id, pullreq.repoId);

    diffPromises.push(limit(() => getDiffStatForPr(pullreq.id, pullreq.repoId)));
}

const diffs = await Promise.all(diffPromises);
const totalLinesAdded = diffs.reduce((a, b) => a + b.linesAdded, 0);
const totalLinesRemoved = diffs.reduce((a, b) => a + b.linesRemoved, 0);
console.log('total lines added:', totalLinesAdded);
console.log('total lines removed:', totalLinesRemoved);

//comments
const repoIdsOfReposIContributedTo = new Set(myPrs.map((x) => x.repoId));
console.log(repoIdsOfReposIContributedTo);

let myTotalComments = 0;
for (const repoId of repoIdsOfReposIContributedTo) {
    const c = await getAllPullRequestsForRepoNotMine(repoId, userId);
    const mine = c.filter((x) => userId === x.user.uuid).length;
    myTotalComments += mine;
}
console.log('total comments', myTotalComments);
console.log('total lines added:', totalLinesAdded);
console.log('total lines removed:', totalLinesRemoved);
console.log('total pull requests:', totalMergedPRs);

console.timeEnd();
