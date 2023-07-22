export interface UserResponse {
    display_name: string;
    links: Links;
    created_on: string;
    type: string;
    uuid: string;
    has_2fa_enabled: null;
    username: string;
    is_staff: boolean;
    account_id: string;
    nickname: string;
    account_status: string;
    location: null;
}

export interface Links {
    self: Avatar;
    avatar: Avatar;
    repositories: Avatar;
    snippets: Avatar;
    html: Avatar;
    hooks: Avatar;
}

export interface Avatar {
    href: string;
}
