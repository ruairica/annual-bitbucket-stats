import axios from 'axios';
import { diffNums, toBase64 } from './helper.js';
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
        reposContributedTo.add(pr.destination.repository.uuid);
        await getDiffStatForPr(
            pr.id,
            pr.destination.repository.uuid,
            pr.destination.repository.name
        );
        if (!sums.has(pr.destination.repository.name)) {
            sums.set(pr.destination.repository.name, 1);
        } else {
            sums.set(pr.destination.repository.name, sums.get(pr.destination.repository.name) + 1);
        }
    }
    return;

    if (response.data.next) {
        await getPullRequestPage(response.data.next);
    }
}

async function getPullRequestComments(url: string) {
    const response = await axios.get<PullRequestCommentsResponse>(url);

    for (const comment of response.data.values) {
        if (userIds.includes(comment.user.uuid)) {
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

async function getDiffStatForPr(prId: number, repoId: string, repoName: string) {
    const url = `https://api.bitbucket.org/2.0/repositories/esosolutions/${repoId}/pullrequests/${prId}/diffstat`;
    console.log('diff stat for', prId, repoId);
    const response = await axios.get<DiffStat>(url);
    let added = 0;
    let removed = 0;

    for (const file of response.data.values) {
        added += file.lines_added;
        removed += file.lines_removed;
    }

    // TODO this has pagination but has size of 500 files so probably unneeded
    const diffTotal: diffNums = { linesAdded: added, linesRemoved: removed };
    diffs.set(`repository: ${repoName} - PR ID: ${prId}`, diffTotal);
}

async function getCurrentUserId() {
    const response = await axios.get<UserResponse>(`https://api.bitbucket.org/2.0/user`);
    return response.data.uuid;
}

let totalComments = 0;
let requestsCommentedOn = 0;
const reposContributedTo = new Set();
const sums = new Map<string, number>();
// key  = repo name - PR Id
const diffs = new Map<string, diffNums>();
const userIds = [await getCurrentUserId()]; // can add uuid's of previous bitbucket account to this array (have to get them out of dev tools of old pull requests).

for (const userId of userIds) {
    console.log('for userId=', userId);
    await getMergedPullRequestsForUser(userId);
    // await getDiffStatForPr(848, 'Internal&20Tools%20v2');
    // for (const repoId: string of reposContributedTo) {
    //     await getAllPullRequestsForRepoNotMine(repoId, userId);
    // }
}

// console.log(sums);
// const totalMergedPRs = [...sums.values()].reduce((a, b) => a + b, 0);
// console.log('total pull requests:', totalMergedPRs);
// console.log(diffs);
// const totalLinesAdded = [...diffs.values()].reduce((a, b) => a + b.linesAdded, 0);
// const totalLinesRemoved = [...diffs.values()].reduce((a, b) => a + b.linesRemoved, 0);
// console.log('total lines added:', totalLinesAdded);
// console.log('total lines removed:', totalLinesRemoved);

await getPullRequestComments(
    'https://api.bitbucket.org/2.0/repositories/esosolutions/inventory/pullrequests/1893/comments'
);
console.log(totalComments);
// these are returned from the get pull request endpoint
//TESTING
// comments
//https://api.bitbucket.org/2.0/repositories/esosolutions/inventory/pullrequests/1893/comments

/* 
    "diff": {
      "href": "https://api.bitbucket.org/2.0/repositories/esosolutions/inventory/diff/esosolutions/inventory:b14fa05ac36d%0Deaf70a73616a?from_pullrequest_id=1893&topic=true&exclude_files=ec201d55-b6a4-486f-bd8c-1dc114c4f4d8"
    },

    //
    "diffstat": {
      "href": "https://api.bitbucket.org/2.0/repositories/esosolutions/inventory/diffstat/esosolutions/inventory:b14fa05ac36d%0Deaf70a73616a?from_pullrequest_id=1893&topic=true&exclude_files=ec201d55-b6a4-486f-bd8c-1dc114c4f4d8"
    },
    */

// const resp = await makeGenericRequest(
//     'https://api.bitbucket.org/2.0/repositories/esosolutions/inventory/pullrequests/1893/diffstat'
// );

// console.log(JSON.stringify(resp));
// fs.appendFile('file.txt', JSON.stringify(resp), (err) => {
//     if (err) throw err;
//     console.log('The "data to append" was appended to file!');
// });
