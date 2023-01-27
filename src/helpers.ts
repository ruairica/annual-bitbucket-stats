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

export interface paginatedResponse<T extends apiResponseValue> {
    values: T[];
    pagelen: number;
    size: number;
    page: number;
    next: string;
}

// marker interface to enforce certain values of paginatedResponse
const brand = Symbol();
export interface apiResponseValue {
    [brand]: never;
}

export const toBase64 = (str: string): string => {
    return Buffer.from(str).toString('base64');
};

// combines pr id and repo id to a string
export const fullPrIdName = (repoId: string, prId: number) => {
    return `${repoId}_${prId}`;
};

export const isBranchOfInterest = (branchName: string, branchesOfInterest: string[]): boolean => {
    return branchesOfInterest.some((b) => b.startsWith(branchName));
};

export const getMedian = (arr: number[]): number => {
    const mid = Math.floor(arr.length / 2);
    const nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};
