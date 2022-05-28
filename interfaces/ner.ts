export interface Rectangle {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface PageOcrDataWord {
    text: string;
    left: number;
    top: number;
    width: number;
    height: number;
    tagId?: number;
}

export interface PageOcrData {
    words: Array<PageOcrDataWord>;
    image: string;
    height: number;
    width: number;
}

export declare enum TextLayerType {
    TEXT_LAYER = 'TEXT_LAYER',
    ORC = 'OCR',
}

export interface Annotation extends AnnotationParams {
    id: number;
}

export interface PDFMetaData {
    width: number;
    height: number;
    scale: number;
}

export interface AnnotationParams {
    entity: Entity;
    page: number;
    nerAnnotation?: NerAnnotation;
    score?: number;
    index?: number;
}

interface NerAnnotation {
    textIds: Array<number>;
    tokens: Array<string>;
}

export interface Entity {
    id: number;
    name: string;
    color: string;
}

export const entities: Array<Entity> = [
    {
        id: 1,
        name: 'BROKER',
        color: '#4DD0E1',
    },
    {
        id: 2,
        name: 'REF_NUM_ID',
        color: '#4DB6AC',
    },
    {
        id: 3,
        name: 'REF_NUM',
        color: '#81C784',
    },
    {
        id: 4,
        name: 'RATE_ID',
        color: '#AED581',
    },
    {
        id: 5,
        name: 'RATE',
        color: '#DCE775',
    },
    {
        id: 6,
        name: 'PU_ID',
        color: '#b39ddb',
    },
    {
        id: 7,
        name: 'PU_NAME',
        color: '#924eea',
    },
    {
        id: 8,
        name: 'PU_ADDRESS',
        color: '#47cf5f',
    },
    {
        id: 9,
        name: 'PU_DATE_ID',
        color: '#b52c4c',
    },
    {
        id: 10,
        name: 'PU_DATE',
        color: '#b05e25',
    },
    {
        id: 11,
        name: 'PU_TIME_ID',
        color: '#f55957',
    },
    {
        id: 12,
        name: 'PU_TIME',
        color: '#c04087',
    },
    {
        id: 13,
        name: 'SO_ID',
        color: '#cc642f',
    },
    {
        id: 14,
        name: 'SO_NAME',
        color: '#8990f6',
    },
    {
        id: 15,
        name: 'SO_ADDRESS',
        color: '#4c6883',
    },
    {
        id: 16,
        name: 'SO_DATE_ID',
        color: '#6997b5',
    },
    {
        id: 17,
        name: 'SO_DATE',
        color: '#1f81d8',
    },
    {
        id: 18,
        name: 'SO_TIME_ID',
        color: '#e48f3c',
    },
    {
        id: 19,
        name: 'SO_TIME',
        color: '#ec89e0',
    },
];
