import axios from 'axios';
import pLimit from 'p-limit';
import { commentModel, diffNums, prTag, toBase64 } from './helper.js';
import { DiffStat } from './types/DiffStat.js';
import { PullRequestCommentsResponse } from './types/PullRequestComments.js';
import { PullRequestResponse } from './types/UserPullRequestResponse.js';
import { UserResponse } from './types/UserResponse.js';

const limit = pLimit(100);
const userName = 'ruairicaldwell';
const appPassword = 'ATBBzKSwJyuqfweZDFenGjSMQhBR7354B12F';
const workSpace = 'esosolutions';
const year = 2022;

//constants
const baseUrl = 'https://api.bitbucket.org/2.0';
axios.defaults.headers.common['Authorization'] = `Basic ${toBase64(`${userName}:${appPassword}`)}`;

// given a url that returns pull requests, returns all the pull requests as a list
export async function getAllPaginatedValuesPr(url: string) {
    const responseData: PullRequestResponse[] = [];
    const response = await axios.get<PullRequestResponse>(url);
    responseData.push(response.data);

    const promiseArray = [];
    const totalPages = Math.ceil(response.data.size / response.data.pagelen);
    for (let i = 2; i <= totalPages; i++) {
        promiseArray.push(limit(() => axios.get<PullRequestResponse>(`${url}&page=${i}`)));
    }
    const resolvedPromises = await Promise.all(promiseArray);
    responseData.push(...resolvedPromises.map((x) => x.data));

    return responseData.flatMap((x) => x.values);
}

// returns a lists of all comments on all PR's in a repo that were not authored by the current
export async function getAllCommentsForExcludingMyPrs(repoId: string, userId: string) {
    const initialRequest = `${baseUrl}/repositories/${workSpace}/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > 2022-11-20T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`;

    let commentResponsePromises = (await getAllPaginatedValuesPr(initialRequest)).map((pr) =>
        limit(() =>
            getPrComments(
                `${baseUrl}/repositories/${workSpace}/${pr.destination.repository.uuid}/pullrequests/${pr.id}/comments`
            )
        )
    );

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

    return comments.map(
        (x) => ({ uuid: x.user.uuid, prId: `${repoId}_${x.pullrequest.id}` } as commentModel)
    );
}

export async function getPrComments(url: string) {
    const response = await axios.get<PullRequestCommentsResponse>(url);
    return response.data;
}

// returns how many lines were added / removed for a specific PR
export async function getDiffStatForPr(prId: number, repoId: string): Promise<diffNums> {
    const url = `${baseUrl}/repositories/${workSpace}/${repoId}/pullrequests/${prId}/diffstat`;
    const response = await axios.get<DiffStat>(url);

    // this has pagination but has size of 500 files per page so probably unneeded
    return {
        linesAdded: response.data.values.reduce((a, b) => a + b.lines_added, 0),
        linesRemoved: response.data.values.reduce((a, b) => a + b.lines_removed, 0),
    };
}

export async function getCurrentUserId() {
    const response = await axios.get<UserResponse>(`${baseUrl}/user`);
    return response.data.uuid;
}

console.time();
const sums = new Map<string, number>();
const userId = await getCurrentUserId(); // [await getCurrentUserId()]; // can add uuid's of previous bitbucket account to this array (have to get them out of dev tools of old pull requests).
const myPrs: prTag[] = [];

for (const pr of await getAllPaginatedValuesPr(
    `${baseUrl}/pullrequests/${userId}?q=state="MERGED" AND created_on > 2022-11-01T00:00:00-00:00 AND created_on < 2023-01-01T00:00:00-00:00`
)) {
    if (
        pr.destination.branch.name == 'develop' ||
        pr.destination.branch.name == 'main' ||
        pr.destination.branch.name.startsWith('release') ||
        pr.destination.branch.name == 'development'
    ) {
        console.log('normal merge', pr.destination.branch.name);

        myPrs.push({ id: pr.id, repoId: pr.destination.repository.uuid });
    } else {
        console.log('found-a-straggler', pr.destination.branch.name);
    }

    sums.set(pr.destination.repository.name, (sums.get(pr.destination.repository.name) ?? 0) + 1);
}

const totalMergedPRs = [...sums.values()].reduce((a, b) => a + b, 0);

const diffs = await Promise.all(
    myPrs.map((pullreq) => limit(() => getDiffStatForPr(pullreq.id, pullreq.repoId)))
);
const totalLinesAdded = diffs.reduce((a, b) => a + b.linesAdded, 0);
const totalLinesRemoved = diffs.reduce((a, b) => a + b.linesRemoved, 0);

// reviews done
const repoIdsOfReposIContributedTo = new Set(myPrs.map((x) => x.repoId));
const allComments = (
    await Promise.all(
        Array.from(repoIdsOfReposIContributedTo).map((repoId) =>
            getAllCommentsForExcludingMyPrs(repoId, userId)
        )
    )
).flatMap((x) => x);
const myComments = allComments.filter((x) => x.uuid == userId);
const distinctPrsCommentedOn = new Set(myComments.map((x) => x.prId));
const myTotalComments = myComments.length;

// output
console.log('number of PRs reviewed', distinctPrsCommentedOn.size);
console.log("total comments left on other people's pr's", myTotalComments);
console.log('total lines added:', totalLinesAdded);
console.log('total lines removed:', totalLinesRemoved);
console.log('total pull requests:', totalMergedPRs);
console.log('mergedPrs distribution', sums);

console.timeEnd();
