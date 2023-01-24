export interface prTag {
    id: number;
    repoId: string;
}

export interface diffNums {
    linesAdded: number;
    linesRemoved: number;
}

export interface commentModel {
    uuid: string;
    prId: string;
}

export interface approver {
    uuid: string;
    prId: number;
}

export function toBase64(str: string): string {
    return Buffer.from(str).toString('base64');
}

// combines PR id and repod id to a string
export function fullPrIdName(repoId: string, prId: number) {
    return `${repoId}_${prId}`;
}

export function isBranchOfInterest(branchName: string, branchesOfInterest: string[]): boolean {
    return branchesOfInterest.some((b) => b.startsWith(branchName));
}

export function getMedian(arr: number[]) {
    const mid = Math.floor(arr.length / 2);
    const nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}
