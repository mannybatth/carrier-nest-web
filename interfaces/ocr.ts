export interface Vertex {
    x: number;
    y: number;
}

export interface TextSegment {
    startIndex: string;
    endIndex: string;
}

export interface OCRPage {
    dimension: {
        height: number;
        unit: string;
        width: number;
    };
    layout: {
        boundingPoly: {
            normalizedVertices: Vertex[];
            vertices: Vertex[];
        };
        confidence: number;
        orientation: string;
        textAnchor: {
            textSegments: TextSegment[];
        };
    };
    tokens: {
        layout: {
            boundingPoly: {
                normalizedVertices: Vertex[];
                vertices: Vertex[];
            };
            confidence: number;
            orientation: string;
            textAnchor: {
                textSegments: TextSegment[];
            };
        };
    }[];
    lines: {
        layout: {
            boundingPoly: {
                normalizedVertices: Vertex[];
                vertices: Vertex[];
            };
            confidence: number;
            orientation: string;
            textAnchor: {
                textSegments: TextSegment[];
            };
        };
    }[];
}
