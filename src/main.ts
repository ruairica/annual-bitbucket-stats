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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function* makeRequest(_endpoint: string): any {
    const response = await axios.get<PullRequestResponse>(_endpoint);
    const page = response.data;

    yield page;

    if (page.next) {
        yield* makeRequest(page.next);
    }
}

async function* pageThroughResource(endpoint: string) {
    yield* makeRequest(endpoint);
}

async function* loadUsersPullRequests(userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/pullrequests/${userId}?q=state="MERGED" AND created_on > 2022-11-01T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;
    const result = pageThroughResource(initialRequest);

    for await (const page of result) {
        for (const pr of page.values) {
            yield pr;
        }
    }
}

async function AsyncgetAllPullRequestsForRepoNotMine(repoId: string, userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-20T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;
    const allPullRequestsResponses: PullRequestCommentsResponse[] = [];
    const response = await axios.get<PullRequestCommentsResponse>(initialRequest);
    allPullRequestsResponses.push(response.data);

    let promiseArray = [];
    let totalTrips = response.data.size;
    let totalPages = Math.ceil(totalTrips / response.data.pagelen);
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
            axios.get<PullRequestCommentsResponse>(
                `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-20T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00&page=${i}`
            )
        );
    }
    const resolvedPromises = await Promise.all(promiseArray);
    console.log('requests made', resolvedPromises.length + 1);
    allPullRequestsResponses.push(...resolvedPromises.map((x) => x.data));
    console.log('allPullRequestsResponses', allPullRequestsResponses.length);

    const allPullRequests = allPullRequestsResponses.flatMap((x) => x.values);
    // have all pull requets here, for each one, get all the comments in a similar way?

    for (const pr of allPullRequests) {
    }
}

async function getAllPullRequestsForRepoNotMine(repoId: string, userId: string) {
    const initialRequest = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-20T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;
    await goThroughPullRequestsForComments(initialRequest, userId);
}

async function getPullRequestComments(url: string) {
    const response = await axios.get<PullRequestCommentsResponse>(url);
    for (const comment of response.data.values) {
        if (userId === comment.user.uuid) {
            console.log(url);
            totalComments += 1;
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
let totalComments = 0;
const sums = new Map<string, number>();
// key  = repo name - PR Id
const userId = await getCurrentUserId(); // [await getCurrentUserId()]; // can add uuid's of previous bitbucket account to this array (have to get them out of dev tools of old pull requests).
const myPrs: prTag[] = [];
// await getMergedPullRequestsForUser(userId);

// number of PR's by me
for await (const pr of loadUsersPullRequests(userId)) {
    myPrs.push({ id: pr.id, repoId: pr.destination.repository.uuid });
    if (!sums.has(pr.destination.repository.name)) {
        sums.set(pr.destination.repository.name, 1);
    } else {
        sums.set(pr.destination.repository.name, sums.get(pr.destination.repository.name) + 1); // TODO ternary
    }
}

console.log(sums);
const totalMergedPRs = [...sums.values()].reduce((a, b) => a + b, 0);
console.log('total pull requests:', totalMergedPRs);

// diff stats
const diffPromises: Promise<diffNums>[] = [];
for (const pullreq of myPrs) {
    diffPromises.push(getDiffStatForPr(pullreq.id, pullreq.repoId));
}

const diffs = await Promise.all(diffPromises);
const totalLinesAdded = diffs.reduce((a, b) => a + b.linesAdded, 0);
const totalLinesRemoved = diffs.reduce((a, b) => a + b.linesRemoved, 0);
console.log('total lines added:', totalLinesAdded);
console.log('total lines removed:', totalLinesRemoved);

//comments
const repoIdsOfReposIContributedTo = new Set(myPrs.map((x) => x.repoId));
console.log(repoIdsOfReposIContributedTo);
for (const repoId of repoIdsOfReposIContributedTo) {
    console.log('on repo', repoId);
    // await getAllPullRequestsForRepoNotMine(repoId, userId);
    await AsyncgetAllPullRequestsForRepoNotMine(repoId, userId);
}

// console.log(totalComments);

console.timeEnd();
