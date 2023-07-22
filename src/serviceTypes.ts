export type quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;

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
