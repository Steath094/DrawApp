export type Shape = {
    id: string | null,
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number
} | {
    id: string | null,
    type: "circle",
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number
} | {
    id: string | null,
    type: "line",
    startX: number,
    startY: number,
    endX: number,
    endY: number
} | {
    id: string | null,
    type: "rhombus",
    topX: number,
    topY: number,
    rightX: number,
    rightY: number,
    bottomX: number,
    bottomY: number,
    leftX: number,
    leftY: number
} | {
    id: string | null,
    type: "arrow",
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
} | {
    id: string | null,
    type: "pencil",
    points: number[][]
} | {
    id: string | null,
    type: "text",
    text: string,
    startX: number,
    startY: number,
    width:number,
    height:number
}
export type HandleType = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
