import { apiResponseValue, paginatedResponse } from '../helpers.js';
import { User } from './PullRequestResponse.js';

export type PullRequestCommentsResponse = paginatedResponse<comment>;

export type comment = commentItem & apiResponseValue;

export interface commentItem {
    id: number;
    created_on: string;
    updated_on: string;
    content: Content;
    user: User;
    deleted: boolean;
    inline: Inline;
    type: string;
    links: ValueLinks;
    pullrequest: Pullrequest;
    parent?: Parent;
}

export interface Content {
    type: string;
    raw: string;
    markup: string;
    html: string;
}

export interface Inline {
    from: null;
    to: number;
    path: string;
}

export interface ValueLinks {
    self: Code;
    html: Code;
    code: Code;
}

export interface Code {
    href: string;
}

export interface Parent {
    id: number;
    links: ParentLinks;
}

export interface ParentLinks {
    self: Code;
    html: Code;
}

export interface Pullrequest {
    type: string;
    id: number;
    title: string;
    links: ParentLinks;
}

export interface UserLinks {
    self: Code;
    avatar: Code;
    html: Code;
}
