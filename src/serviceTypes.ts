export type quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;

export interface PrId {
    id: number;
    repoId: string;
}

export interface Diff {
    linesAdded: number;
    linesRemoved: number;
}

export interface PrComment {
    uuid: string;
    prId: string;
}

export interface PrApprover {
    uuid: string;
    prId: number;
}

export interface PaginatedResponse<T extends ApiResponseValue> {
    values: T[];
    pagelen: number;
    size: number;
    page: number;
    next: string;
}

// marker interface to enforce certain values of paginatedResponse
const brand = Symbol();
export interface ApiResponseValue {
    [brand]: never;
}
