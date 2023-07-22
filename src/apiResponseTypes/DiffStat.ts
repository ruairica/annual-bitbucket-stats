import { ApiResponseValue, PaginatedResponse } from '../serviceTypes.js';

export type diffStatResponse = PaginatedResponse<diff>;

export type diff = diffItem & ApiResponseValue;

export interface diffItem {
    type: string;
    lines_added: number;
    lines_removed: number;
    status: string;
    old: New | null;
    new: New;
}

export interface New {
    path: string;
    type: string;
    escaped_path: string;
    links: Links;
}

export interface Links {
    self: Self;
}

export interface Self {
    href: string;
}
