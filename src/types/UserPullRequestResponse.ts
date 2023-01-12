export interface PullRequestResponse {
    values: Value[];
    pagelen: number;
    size: number;
    page: number;
    next: string;
}

export interface Value {
    comment_count: number;
    task_count: number;
    type: string;
    id: number;
    title: string;
    description: string;
    state: string;
    merge_commit: Commit;
    close_source_branch: boolean;
    closed_by: Author;
    author: Author;
    reason: string;
    created_on: string;
    updated_on: string;
    destination: Destination;
    source: Destination;
    links: { [key: string]: Link };
    summary: Summary;
}

export interface Author {
    display_name: string;
    links: AuthorLinks;
    type: string;
    uuid: string;
    account_id: string;
    nickname: string;
}

export interface AuthorLinks {
    self: Link;
    avatar: Link;
    html: Link;
}

export interface Link {
    href: string;
}

export interface Destination {
    branch: Branch;
    commit: Commit;
    repository: Repository;
}

export interface Branch {
    name: string;
}

export interface Commit {
    type: string;
    hash: string;
    links: MergeCommitLinks;
}

export interface MergeCommitLinks {
    self: Link;
    html: Link;
}

export interface Repository {
    type: string;
    full_name: string;
    links: AuthorLinks;
    name: string;
    uuid: string;
}

export interface Summary {
    type: string;
    raw: string;
    markup: string;
    html: string;
}
