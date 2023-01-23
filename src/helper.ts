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

export function toBase64(str: string): string {
    return Buffer.from(str).toString('base64');
}

// combines PR id and repod id to a string
export function fullPrIdName(repoId: string, prId: number) {
    return `${repoId}_${prId}`;
}
