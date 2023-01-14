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
