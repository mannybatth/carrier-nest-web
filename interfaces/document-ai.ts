export interface ITextSegment {
    /** TextSegment startIndex */
    startIndex?: number | Long | string | null;

    /** TextSegment endIndex */
    endIndex?: number | Long | string | null;
}

export interface ITextAnchor {
    /** TextAnchor textSegments */
    textSegments?: ITextSegment[] | null;

    /** TextAnchor content */
    content?: string | null;
}
