import axios from 'axios';
import chalk from 'chalk';
import { createSpinner } from 'nanospinner';
import pLimit, { LimitFunction } from 'p-limit';
import { PRActivityResponse } from './apiResponseTypes/ActivityResponse.js';
import { diffStatResponse } from './apiResponseTypes/DiffStat.js';
import { comment } from './apiResponseTypes/PullRequestComments.js';
import { pullRequest } from './apiResponseTypes/PullRequestResponse.js';
import { UserResponse } from './apiResponseTypes/UserResponse.js';
import {
    apiResponseValue,
    approver,
    commentModel,
    diffNums,
    paginatedResponse,
    prTag,
    quarter,
} from './serviceTypes.js';
export class bitbucketStatsService {
    private readonly baseUrl = 'https://api.bitbucket.org/2.0';

    // input variables
    private limit: LimitFunction;
    private workSpace: string;
    private mainBranches: string[]; // will check for pull requests being merged into these branches (uses startsWith for comparison)
    private year: number;
    private quarter: quarter;
    private prsCommentedOn: number;

    private userId: string;
    private dateRange = '';

    // outputs
    private numberOfPrsReviewed: number;
    private totalCommentsLeftOnPrs: number;
    private myDiffs: diffNums[] = [];
    private sums = new Map<string, number>();
    private repoIdsOfReposIContributedTo = new Set<string>();
    private totalMergedPrs: number;
    private myPrs: prTag[] = [];

    constructor(
        userName: string,
        appPassword: string,
        workSpace: string,
        year: number,
        quarter: quarter,
        mainBranches: string[],
        asyncLimit: number
    ) {
        this.workSpace = workSpace;
        this.mainBranches = mainBranches;
        this.year = year;
        this.quarter = quarter;
        this.limit = pLimit(asyncLimit);
        this.dateRange = this.getDateRange();

        // set header for api requests
        axios.defaults.headers.common['Authorization'] = `Basic ${this.toBase64(
            `${userName}:${appPassword}`
        )}`;
    }

    async getStats() {
        const timeLabel = 'Time taken to retrieve info';
        console.time(timeLabel);
        await this.getUserInfo();
        await this.getMyPullRequests();
        await this.getDiffsForMyPullRequests();
        await this.getMyPullRequestReviewStats();
        console.timeEnd(timeLabel);
    }

    printOutput() {
      
        console.log(
            chalk.inverse(`${this.year}`),
            `${this.quarter ? '-' : ''}`,
            chalk.inverse(`${this.quarter ?? ''}`)
        );

        console.log(
            chalk.whiteBright(`You merged`),
            chalk.blue(this.totalMergedPrs),
            chalk.whiteBright('pull requests across'),
            chalk.blue([...this.sums.keys()].length),
            chalk.whiteBright(
                `repositories, (only pull requests into branches that start with: ${this.mainBranches.join(
                    ', '
                )} are counted)`
            )
        );

        this.sums.forEach((v, k) => console.log(chalk.whiteBright(`${k} =>`), chalk.blue(v)));

        console.log('\n');

        const linesAdded = this.myDiffs.reduce((a, b) => a + b.linesAdded, 0);
        const linesRemoved = this.myDiffs.reduce((a, b) => a + b.linesRemoved, 0);
        console.log(
            chalk.whiteBright('In these pull requests you added'),
            chalk.blue(linesAdded),
            chalk.whiteBright('lines of code, and removed'),
            chalk.blue(linesRemoved),
            chalk.whiteBright(
                `lines of code over the year. (This currently includes all files, even files that might be auto-generated)`
            )
        );

        console.log(
            chalk.whiteBright(`That's a mean average of`),
            chalk.blue(
                `+${Math.floor(linesAdded / 12)}/-${Math.floor(
                    linesRemoved / (this.quarter ? 3 : 12)
                )}`
            ),
            chalk.whiteBright(`lines of code per month`)
        );

        console.log(
            chalk.whiteBright('Your mean average lines added per PR is'),
            chalk.blue(`${Math.floor(linesAdded / this.myDiffs.length)}`)
        );

        console.log(
            chalk.whiteBright('Your mean average lines removed per PR is'),
            chalk.blue(`${Math.floor(linesRemoved / this.myDiffs.length)}`)
        );

        console.log(
            chalk.whiteBright('Your median average lines added per PR is'),
            chalk.blue(`${this.getMedian(this.myDiffs.map((x) => x.linesAdded))}`)
        );

        console.log(
            chalk.whiteBright('Your median average lines removed per PR is'),
            chalk.blue(`${this.getMedian(this.myDiffs.map((x) => x.linesRemoved))}`)
        );

        console.log('\n');

        console.log(
            chalk.whiteBright('You reviewed (commented on or approved)'),
            chalk.blue(this.numberOfPrsReviewed),
            chalk.whiteBright(
                'pull requests in total (checked across all the repositories you contributed to), you commented on'
            ),
            chalk.blue(this.prsCommentedOn),
            chalk.whiteBright('of these pull requests')
        );

        console.log(
            chalk.whiteBright(`You left a total of`),
            chalk.blue(this.totalCommentsLeftOnPrs),
            chalk.whiteBright(`comments on these pull requests`)
        );

        console.log(
            chalk.whiteBright(`On average you left`),
            chalk.blue(
                `${(
                    Math.round((this.totalCommentsLeftOnPrs / this.numberOfPrsReviewed) * 100) / 100
                ).toFixed(1)}`
            ),
            chalk.whiteBright(`comments per pull request you reviewed`)
        );
    }

    private async getUserInfo() {
        const spinner = createSpinner('Getting user information').start();
        const user = await this.getCurrentUser();
        this.userId = user.uuid;
        spinner.success({ text: 'Sucessfully retrieved necessary user information' });
    }

    private async getMyPullRequestReviewStats() {
        const spinner = createSpinner(
            'Getting all the pull requests you reviewed (this might take a minute...)'
        ).start();

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

        this.prsCommentedOn = distinctPrsCommentedOn.size;
        this.numberOfPrsReviewed =
            prsApprovedButNotCommentedOn.length + distinctPrsCommentedOn.size;
        spinner.success({ text: 'Sucessfully retrieved all the pull requests you reviewed' });
    }

    private async getDiffsForMyPullRequests() {
        const spinner = createSpinner('Getting diffs for your pull requests').start();

        const diffs = await Promise.all(
            this.myPrs.map((pullreq) =>
                this.limit(() => this.getDiffStatForPr(pullreq.id, pullreq.repoId))
            )
        );

        this.myDiffs.push(...diffs);
        spinner.success({ text: 'Sucessfully retrieved diffs' });
    }

    private async getMyPullRequests() {
        const spinner = createSpinner('Getting all your merged pull requests.').start();
        for (const pr of await this.getAllPaginatedValues<pullRequest>(
            `${this.baseUrl}/pullrequests/${this.userId}?q=state="MERGED" AND ${this.dateRange}`
        )) {
            if (this.isBranchOfInterest(pr.destination.branch.name, this.mainBranches)) {
                this.myPrs.push({ id: pr.id, repoId: pr.destination.repository.uuid });
                this.sums.set(
                    pr.destination.repository.name,
                    (this.sums.get(pr.destination.repository.name) ?? 0) + 1
                );
            }
        }

        this.repoIdsOfReposIContributedTo = new Set(this.myPrs.map((x) => x.repoId));
        this.totalMergedPrs = [...this.sums.values()].reduce((sum, cur) => sum + cur, 0);

        spinner.success({
            text: 'Successfully retrieved all of your merged pull requests',
        });
    }

    // given a url that returns a paginated endpoint return all the values in one array
    private async getAllPaginatedValues<T extends apiResponseValue>(url: string): Promise<T[]> {
        const limit = pLimit(100);
        const responseData: paginatedResponse<T>[] = [];

        // await the first response to see how many pages there is
        const response = await axios.get<paginatedResponse<T>>(url);
        responseData.push(response.data);

        const promiseArray = [];
        const totalPages = Math.ceil(response.data.size / response.data.pagelen);

        for (let i = 2; i <= totalPages; i++) {
            promiseArray.push(
                limit(() =>
                    axios.get<paginatedResponse<T>>(
                        // inconsistent pagination syntax from their api
                        `${url}${url.endsWith('comments') ? '?' : '&'}page=${i}`
                    )
                )
            );
        }
        const resolvedPromises = await Promise.all(promiseArray);
        responseData.push(...resolvedPromises.map((x) => x.data));

        return responseData.flatMap((x) => x.values);
    }

    private async getAllPrsIApproved(repoId: string, userId: string): Promise<string[]> {
        const initialRequest = `${this.baseUrl}/repositories/${this.workSpace}/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND ${this.dateRange}`;

        const allPrs = await this.getAllPaginatedValues<pullRequest>(initialRequest);
        const prActivityPromises = allPrs.map((pr) => {
            return this.limit(() =>
                this.getPrApproversWrapper(
                    `${this.baseUrl}/repositories/${this.workSpace}/${pr.destination.repository.uuid}/pullrequests/${pr.id}/activity`
                )
            );
        });

        const allPrAct = await Promise.all(prActivityPromises);
        const prActivies = allPrAct.flatMap((x) => x);

        return prActivies.map((x) => this.fullPrIdName(repoId, x.prId));
    }

    // returns a lists of all comments on all PR's in a repo that were not authoblue by the current
    private async getAllCommentsForExcludingMyPrs(
        repoId: string,
        userId: string
    ): Promise<commentModel[]> {
        const initialRequest = `${this.baseUrl}/repositories/${this.workSpace}/${repoId}/pullrequests?q=state="MERGED" AND author.uuid != "${userId}" AND ${this.dateRange}`;

        const allPrs = await this.getAllPaginatedValues<pullRequest>(initialRequest);
        const commentPromises = allPrs.map((pr) => {
            return this.limit(() =>
                this.getAllPaginatedValues<comment>(
                    `${this.baseUrl}/repositories/${this.workSpace}/${pr.destination.repository.uuid}/pullrequests/${pr.id}/comments`
                )
            );
        });

        const comments = (await Promise.all(commentPromises)).flatMap((x) => x);
        return comments.map(
            (x) =>
                ({
                    uuid: x.user.uuid,
                    prId: this.fullPrIdName(repoId, x.pullrequest.id),
                } as commentModel)
        );
    }

    private async getPrApproversWrapper(url: string): Promise<approver[]> {
        const approvers: approver[] = [];
        await this.getPrApprovers(url, approvers);
        return approvers.filter((x) => x.uuid === this.userId);
    }

    private async getPrApprovers(url: string, approvers: approver[]): Promise<approver[]> {
        const response = await axios.get<PRActivityResponse>(url);
        const approvalsValue = response.data.values.filter((x) => x.approval);

        if (approvalsValue) {
            approvers.push(
                ...approvalsValue.map((x) => ({
                    uuid: x.approval.user.uuid,
                    prId: x.pull_request.id,
                }))
            );
        }

        // this is a bit unneeded as the approval is very likely to be on the first page, makes no difference for my personal stats but may for others
        // if (approvers.some((x) => x.uuid === this.userId)) {
        //     return approvers;
        // }
        // if (response.data.next) {
        //     return await this.getPrApprovers(response.data.next, approvers);
        // }

        return approvers;
    }

    // returns how many lines were added / removed for a specific PR
    private async getDiffStatForPr(prId: number, repoId: string): Promise<diffNums> {
        const url = `${this.baseUrl}/repositories/${this.workSpace}/${repoId}/pullrequests/${prId}/diffstat`;
        const response = await axios.get<diffStatResponse>(url);

        // this has pagination but has size of 500 files per page so probably unneeded
        return {
            linesAdded: response.data.values.reduce((sum, cur) => sum + cur.lines_added, 0),
            linesRemoved: response.data.values.reduce((sum, cur) => sum + cur.lines_removed, 0),
        };
    }

    private async getCurrentUser(): Promise<UserResponse> {
        const response = await axios.get<UserResponse>(`${this.baseUrl}/user`);
        return response.data;
    }

    private getDateRange(): string {
        if (this.quarter === null) {
            return `created_on > ${this.year}-01-01T00:00:00-00:00 AND created_on < ${
                this.year + 1
            }-01-01T00:00:00-00:00`;
        }

        if (this.quarter === 'Q4') {
            return `created_on > ${this.year}-10-01T00:00:00-00:00 AND created_on < ${
                this.year + 1
            }-01-01T00:00:00-00:00`;
        }

        const quaterMap: Map<quarter, number> = new Map([
            ['Q1', 1],
            ['Q2', 4],
            ['Q3', 7],
        ]);

        const startMonth = quaterMap.get(this.quarter);

        return `created_on > ${this.year}-${startMonth}-01T00:00:00-00:00 AND created_on < ${
            this.year
        }-${startMonth + 3}-01T00:00:00-00:00`;
    }

    private toBase64(str: string): string {
        return Buffer.from(str).toString('base64');
    }

    // combines pr id and repo id to a string
    private fullPrIdName(repoId: string, prId: number) {
        return `${repoId}_${prId}`;
    }

    private isBranchOfInterest(branchName: string, branchesOfInterest: string[]): boolean {
        return branchesOfInterest.some((b) => branchName.startsWith(b));
    }

    private getMedian(arr: number[]): number {
        const mid = Math.floor(arr.length / 2);
        const nums = [...arr].sort((a, b) => a - b);
        return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    }
}
