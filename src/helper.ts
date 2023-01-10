export const hey = 'hey';

export interface sampleInterface {
    one: string;
    two: number;
}

export interface diffNums {
    linesAdded: number;
    linesRemoved: number;
}

export function toBase64(str: string): string {
    return Buffer.from(str).toString('base64');
}
