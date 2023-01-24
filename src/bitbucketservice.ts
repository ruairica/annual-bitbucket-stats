import axios from 'axios';
import pLimit, { LimitFunction } from 'p-limit';
import {
    commentModel,
    diffNums,
    fullPrIdName,
    isBranchOfInterest,
    prTag,
    toBase64,
} from './helper.js';
import { PRActivityResponse } from './types/ApprovalResponse.js';
import { DiffStat } from './types/DiffStat.js';
import { PullRequestCommentsResponse } from './types/PullRequestComments.js';
import { PullRequestResponse } from './types/UserPullRequestResponse.js';
import { UserResponse } from './types/UserResponse.js';
export class bitbucketService {
    private baseUrl = 'https://api.bitbucket.org/2.0';

    // input variables
    private limit: LimitFunction;
    private workSpace: string;
    private mainBranches: string[]; // will check for pull requests being merged into these branches (uses startsWith for comparison)
    private year: number;

    userId: string;

    total = 0;
    totalWithApproved = 0;
    // outputs
    numberOfPrsReviewed: number;
    totalCommentsLeftOnPrs: number;
    myDiffs: diffNums[] = [];
    sums = new Map<string, number>();
    repoIdsOfReposIContributedTo = new Set<string>();
    totalMergedPrs: number;
    myPrs: prTag[] = [];

    constructor(
        userName: string,
        appPassword: string,
        workSpace: string,
        year: number,
        mainBranches: string[],
        asyncLimit: number
    ) {
        this.workSpace = workSpace;
        this.mainBranches = mainBranches;
        this.year = year;
        this.limit = pLimit(asyncLimit);

        // set header for api requests
        axios.defaults.headers.common['Authorization'] = `Basic ${toBase64(
            `${userName}:${appPassword}`
        )}`;
    }

    public async run() {
        this.userId = await this.getCurrentUserId();

        console.log('getting my pull requests');
        await this.getMyPullRequests();

        console.log('getting diffs');

        await this.getDiffsForMyPullRequests();

        this.repoIdsOfReposIContributedTo = new Set(this.myPrs.map((x) => x.repoId));

        console.log('getting comments');
        await this.getMyPullRequestReviewStats();
    }

    public output() {
        const linesAdded = this.myDiffs.reduce((a, b) => a + b.linesAdded, 0);
        const linesRemoved = this.myDiffs.reduce((a, b) => a + b.linesRemoved, 0);
        console.log('total PRs I reviewed', this.numberOfPrsReviewed);
        console.log("total comments left on other people's pr's", this.totalCommentsLeftOnPrs);
        console.log('total lines added:', linesAdded);
        console.log('total lines removed:', linesRemoved);
        console.log('total pull requests:', this.totalMergedPrs);
        console.log('mergedPrs distribution', this.sums);
    }

    private async getMyPullRequestReviewStats() {
        const allComments = (
            await Promise.all(
                Array.from(this.repoIdsOfReposIContributedTo).map((repoId) =>
                    this.getAllCommentsForExcludingMyPrs(repoId, this.userId)
                )
            )
        ).flatMap((x) => x);

        const myComments = allComments.filter((x) => x.uuid == this.userId);
        const distinctPrsCommentedOn = new Set(myComments.map((x) => x.prId));
        this.totalCommentsLeftOnPrs = myComments.length;

        const approvedByMePrs = (
            await Promise.all(
                Array.from(this.repoIdsOfReposIContributedTo).map((repoId) =>
                    this.getAllPrsIApproved(repoId, this.userId)
                )
            )
        ).flatMap((x) => x);

        const prsApprovedButNotCommentedOn = approvedByMePrs.filter(
            (x) => x && !distinctPrsCommentedOn.has(x)
        );

        this.numberOfPrsReviewed =
            prsApprovedButNotCommentedOn.length + distinctPrsCommentedOn.size;
    }

    private async getDiffsForMyPullRequests() {
        const diffs = await Promise.all(
            this.myPrs.map((pullreq) =>
                this.limit(() => this.getDiffStatForPr(pullreq.id, pullreq.repoId))
            )
        );

        this.myDiffs.push(...diffs);
    }

    private async getMyPullRequests() {
        for (const pr of await bitbucketService.getAllPaginatedValuesPr(
            `${this.baseUrl}/pullrequests/${this.userId}?q=state="MERGED" AND created_on > ${
                this.year
            }-11-01T00:00:00-00:00 AND created_on < ${this.year + 1}-01-01T00:00:00-00:00`
        )) {
            if (isBranchOfInterest(pr.destination.branch.name, this.mainBranches)) {
                this.myPrs.push({ id: pr.id, repoId: pr.destination.repository.uuid });
                this.sums.set(
                    pr.destination.repository.name,
                    (this.sums.get(pr.destination.repository.name) ?? 0) + 1
                );
            }
        }

        this.totalMergedPrs = [...this.sums.values()].reduce((a, b) => a + b, 0);
    }

    // given a url that returns pull requests, returns all the pull requests as a list
    private static async getAllPaginatedValuesPr(url: string) {
        const limit = pLimit(100);
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

    // returns list of all PRs I approved
    private async getAllPrsIApproved(repoId: string, userId: string) {
        const initialRequest = `${this.baseUrl}/repositories/${
            this.workSpace
        }/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > ${
            this.year
        }-11-01T00:00:00-00:00 AND created_on < ${this.year + 1}-01-01T00:00:00-00:00`;

        const allPrs = await bitbucketService.getAllPaginatedValuesPr(initialRequest);
        const prActivityPromises = allPrs.map((pr) => {
            return this.limit(() =>
                this.getPrActivity(
                    `${this.baseUrl}/repositories/${this.workSpace}/${pr.destination.repository.uuid}/pullrequests/${pr.id}/activity`
                )
            );
        });

        const prActivies = (await Promise.all(prActivityPromises)).flatMap((x) => x.values);

        console.log('total prActivities', prActivies.length);
        console.log(
            'total prActivities with an approval object',
            prActivies.filter((x) => x.approval).length
        );

        return prActivies
            .filter((x) => x.approval && x.approval.user.uuid === userId)
            .map((x) => fullPrIdName(repoId, x.pull_request.id));
    }

    // returns a lists of all comments on all PR's in a repo that were not authored by the current
    private async getAllCommentsForExcludingMyPrs(repoId: string, userId: string) {
        const initialRequest = `${this.baseUrl}/repositories/${
            this.workSpace
        }/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND created_on > ${
            this.year
        }-11-01T00:00:00-00:00 AND created_on < ${this.year + 1}-01-01T00:00:00-00:00`;

        const allPrs = await bitbucketService.getAllPaginatedValuesPr(initialRequest);
        let commentResponsePromises = allPrs.map((pr) => {
            return this.limit(() =>
                this.getPrComments(
                    `${this.baseUrl}/repositories/${this.workSpace}/${pr.destination.repository.uuid}/pullrequests/${pr.id}/comments`
                )
            );
        });

        let commentResponses = await Promise.all(commentResponsePromises);
        const comments = commentResponses.flatMap((x) => x.values);

        let nexts = commentResponses.filter((x) => x.next).map((x) => x.next);
        while (nexts.length > 0) {
            commentResponsePromises = [];
            commentResponses = [];

            for (const next of nexts) {
                commentResponsePromises.push(this.limit(() => this.getPrComments(next)));
            }

            commentResponses = await Promise.all(commentResponsePromises);
            comments.push(...commentResponses.flatMap((x) => x.values));
            nexts = commentResponses.filter((x) => x.next).map((x) => x.next);
        }

        return comments.map(
            (x) =>
                ({
                    uuid: x.user.uuid,
                    prId: fullPrIdName(repoId, x.pullrequest.id),
                } as commentModel)
        );
    }

    private async getPrComments(url: string) {
        const response = await axios.get<PullRequestCommentsResponse>(url);
        return response.data;
    }

    private async getPrActivity(url: string) {
        const response = await axios.get<PRActivityResponse>(url);
        return response.data;
    }

    // returns how many lines were added / removed for a specific PR
    private async getDiffStatForPr(prId: number, repoId: string): Promise<diffNums> {
        const url = `${this.baseUrl}/repositories/${this.workSpace}/${repoId}/pullrequests/${prId}/diffstat`;
        const response = await axios.get<DiffStat>(url);

        // this has pagination but has size of 500 files per page so probably unneeded
        return {
            linesAdded: response.data.values.reduce((a, b) => a + b.lines_added, 0),
            linesRemoved: response.data.values.reduce((a, b) => a + b.lines_removed, 0),
        };
    }

    private async getCurrentUserId() {
        const response = await axios.get<UserResponse>(`${this.baseUrl}/user`);
        return response.data.uuid;
    }
}
