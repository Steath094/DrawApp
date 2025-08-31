import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";
import getStroke from "perfect-freehand";
import { getSvgPathFromStroke, calculateRoundedCornerRadius } from "./Util";
import { HANDLE_SIZE_PX, SELECTION_PADDING_PX, SELECTION_TOLERENCE_PX, TEXT_ADJUSTED_HEIGHT, TEXT_ADJUSTED_WIDTH } from "./constants";
import { v4 as uuidv4 } from "uuid";
import {WsMessageType} from "./constants"
import { throttle } from 'lodash';
import { log } from "console";
type Shape = {
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
type HandleType = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';

type stack = {
    operationType: "CREATE" | "UPDATE" | "DELETE",
    shape: Shape
}
export class Game {
    private canvas:HTMLCanvasElement;
    private ctx:CanvasRenderingContext2D;
    private interactiveCanvas:HTMLCanvasElement;
    private interactionCtx:CanvasRenderingContext2D;
    private existingShape: Shape[];
    private roomId: number;
    private clicked :boolean;
    private startX = 0;
    private startY = 0;
    private points: number[][];
    private selectedTool:Tool = 'selection';
    socket: WebSocket;
    private zoomlevel: number;
    private offsetX: number;
    private offsetY: number;
    private isDragging = false;
    private lastX=0;
    private lastY=0;
    //text handling
    private activeTextarea: HTMLTextAreaElement | null = null;
    private activeTextPosition: { x: number; y: number } | null = null;
    //selection
    private selectedShapeUUID: string | null = null;
    // hoverSelection
    private hoveredShapeUUID: string | null = null;
    //draggin element while selected
    private isDraggingShape: boolean = false;
    private draggingOffsetX: number = 0;
    private draggingOffsetY: number = 0;
    //throttled function for sending updates
    private throttledSendDraggingUpdate: (shape:Shape)=> void;
    private throttledSendDrawingUpdate: (shape:Shape)=> void;
    private remotePreviews: Map<string, Shape> = new Map();
    private drawingShapeId: string | null = null;
    //resizing
    private activeHandle: HandleType | null = null; //( current side of resize handlers)
    //intial clicks to be detected here
    private resizeInitialBounds: { x: number, y: number, width: number, height: number } | null = null;

    //undo and redo
    private onZoomChange: (newZoom: number) => void;
    private undoStack: stack[]
    private redoStack: stack[]
    constructor(canvas: HTMLCanvasElement,interactiveCanvas: HTMLCanvasElement,roomId:number,socket:WebSocket,onZoomChange: (newZoom: number) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.interactiveCanvas=interactiveCanvas
        this.interactionCtx= interactiveCanvas.getContext("2d")!;
        this.existingShape = [];
        this.roomId = roomId;
        this.socket=socket
        this.clicked=false;
        this.points = [];
        this.zoomlevel=1;
        this.offsetX=0;
        this.offsetY=0;
        this.undoStack = [];
        this.redoStack = [];
        this.onZoomChange=onZoomChange;
        this.init();
        this.initHandlers()
        this.initMouseHandlers()
        //throttled functions
        const sendDragUpdate = (shape: Shape) => {
            this.socket.send(JSON.stringify({ type: WsMessageType.SHAPE_DRAGGING,message:JSON.stringify(shape),roomId,id:shape.id }));
        };
        
        // creates a throttled version of it that only fires every 100ms.
        this.throttledSendDraggingUpdate = throttle(sendDragUpdate, 100);

        // Doing same for drawing a new shape
        const sendDrawUpdate = (shape: Shape) => {
            this.socket.send(JSON.stringify({ type: WsMessageType.SHAPE_DRAWING, message:JSON.stringify(shape),roomId,id:shape.id }));
        };
        this.throttledSendDrawingUpdate = throttle(sendDrawUpdate, 100);
    }
    destroy(){
        this.interactiveCanvas.removeEventListener("mousedown",this.mousedown)

        this.interactiveCanvas.removeEventListener("mouseup",this.mouseup)
        
        this.interactiveCanvas.removeEventListener("mousemove",this.mousemove)

        this.interactiveCanvas.removeEventListener("wheel",this.mousewheel)

        document.removeEventListener("keydown",this.keyDown)

    }
    
    setTool(tool:Tool){
        this.selectedShapeUUID = null;
        this.selectedTool= tool;
        if (this.selectedTool!="selection" && this.selectedTool!='pan') {
            this.interactiveCanvas.style.cursor = 'crosshair';
        }
        this.redrawInteractionLayer();
    }
    setZoom(positive:boolean){
        const scaleAmount = 0.1;
        const centerX = this.canvas.width / 2;  
        const centerY = this.canvas.height / 2;
        const canvasX = (centerX - this.offsetX) / this.zoomlevel;
        const canvasY = (centerY - this.offsetY) / this.zoomlevel;
        if (positive) { 
            this.zoomlevel = Math.min(this.zoomlevel + scaleAmount, 4);
        } else { // Zoom out
            this.zoomlevel = Math.max(this.zoomlevel - scaleAmount, 0.1);
        }
        this.offsetX = centerX - canvasX * this.zoomlevel;
        this.offsetY = centerY - canvasY * this.zoomlevel;
        
        this.clearCanvas();
        this.redrawInteractionLayer();

        this.onZoomChange(this.zoomlevel);
    }
    async init(){
        const cachedShape = this.loadStateFromLocalStorage();
        if (cachedShape) {
            this.existingShape = cachedShape;
            this.clearCanvas();
        }
        this.existingShape = await getExistingShapes(this.roomId);
        // console.log(this.existingShape);
        this.saveStateToLocalStorage();
        this.clearCanvas();
    }
    initHandlers(){
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case WsMessageType.DRAW:{
                    const parsedShape = JSON.parse(message.message)
                    this.existingShape.push(parsedShape)
                    this.clearCanvas()
                    break;
                }
                case WsMessageType.ERASE: {
                    this.existingShape =this.existingShape.filter(shape=> shape.id!=message.id)
                    this.clearCanvas();
                    break;
                }
                case WsMessageType.UPDATE: {
                    const parsedShape = JSON.parse(message.message)
                    const findIndex = this.existingShape.findIndex(s=> s.id==message.id)
                    
                    // console.log(this.existingShape);
                    if (findIndex!=-1) {
                        // console.log(findIndex);                        
                        this.existingShape[findIndex] = parsedShape;
                        // console.log(this.existingShape);
                    }
                    this.clearCanvas();
                    break;
                }
                // case WsMessageType.SHAPE_DRAWING:
                // case WsMessageType.SHAPE_DRAGGING: {
                //     console.log(message);
                      
                //     const parsedShape = JSON.parse(message.message)
                //     this.remotePreviews.set(parsedShape.id, parsedShape);
                //     this.redrawInteractionLayer();
                //     break;
                // }
                default:
                    break;
            }
            this.saveStateToLocalStorage()
        }
    }
    private getStorageKey(): string {
        return `canvas-room-${this.roomId}`;
    }
    private saveStateToLocalStorage() {
        try {
            const storageKey = this.getStorageKey();
            const shapesToSave = JSON.stringify(this.existingShape);
            localStorage.setItem(storageKey, shapesToSave);
        } catch (error) {
            console.error("Failed to save state to local storage:", error);
        }
    }
    private loadStateFromLocalStorage(): Shape[] | null {
        try {
            const storageKey = this.getStorageKey();
            const savedShapes = localStorage.getItem(storageKey);
            if (savedShapes) {
                return JSON.parse(savedShapes);
            }
        } catch (error) {
            console.error("Failed to load state from local storage:", error);
        }
        return null;
    }   
    private handleText(e:MouseEvent){
        const { x, y } = this.transformPanScale(e.clientX, e.clientY);
        // console.log("worked");
        
        const textarea = document.createElement("textarea")
        this.activeTextarea =textarea;
        this.activeTextPosition= {x,y};
        Object.assign(textarea.style,{
            position: "absolute",
            display: "inline-block",
            backfaceVisibility: "hidden",
            margin: "0",
            padding: "0",
            outline: "0",
            resize: "none",
            background: "transparent",
            overflowX: "hidden",
            overflowY: "hidden",
            overflowWrap: "normal",
            boxSizing: "content-box",
            wordBreak: "normal",
            whiteSpace: "pre",
            transform: `translate(${x * this.zoomlevel + this.offsetX}px, ${y * this.zoomlevel + this.offsetY}px)`,
            verticalAlign: "top",
            opacity: "1",
            wrap: "off",
            tabIndex: 0,
            dir: "auto",
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE/Edge
            width: "auto",
            minHeight: "auto",
        })
        // textarea.style.position="fixed"
        // textarea.style.top=`${y}px`
        // textarea.style.left=`${x}px`
        // textarea.style.resize="none";
        textarea.style.zIndex="100";
        textarea.style.color="white"
        // textarea.style.padding="2px"

        textarea.classList.add('drawText')
        const rawMaxWidth =
        window.innerWidth || document.documentElement.clientWidth;
        const rawMaxHeight =
        window.innerHeight || document.documentElement.clientHeight;
        
        const calMaxWidth = rawMaxWidth - x - TEXT_ADJUSTED_WIDTH;
        const calMaxHeight = rawMaxHeight - y - TEXT_ADJUSTED_HEIGHT;
        textarea.style.maxWidth = `${calMaxWidth}px`;
        textarea.style.maxHeight = `${calMaxHeight}px`;

        const textEditorContainer = document.querySelector(
        ".textEditorContainer"
        );
        if (textEditorContainer) {
            textEditorContainer.appendChild(textarea);
            setTimeout(() => textarea.focus(), 0);
        } else {
            console.error("Text editor container not found");
            return;
        }
        let hasUnsavedChanges = false;
        let span: HTMLSpanElement | null = null;
        const resizeTextArea = () =>{
            if (span && document.body.contains(span)) {
                document.body.removeChild(span);
            }
            span = document.createElement("span")
            Object.assign(span.style, {
                visibility: "hidden",
                position: "absolute",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                font: textarea.style.font,
                padding: "0",
                margin: "0",
                lineHeight: "1.2",
            });
            span.textContent = textarea.value || " ";
            document.body.appendChild(span);
            requestAnimationFrame(() => {
                textarea.style.width = `${Math.max(span!.offsetWidth + TEXT_ADJUSTED_HEIGHT, TEXT_ADJUSTED_HEIGHT)}px`;
                textarea.style.height = `${Math.max(span!.offsetHeight + TEXT_ADJUSTED_WIDTH, TEXT_ADJUSTED_WIDTH)}px`;
                textarea.style.overflow = "scroll";
            });

        }
        textarea.addEventListener("input",()=>{
            hasUnsavedChanges=true;
            resizeTextArea();
        })
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                hasUnsavedChanges = true;
                resizeTextArea();
            }
        });
        let saveCalled = false;
        const save = () =>{
            if (saveCalled) return;
            saveCalled=true;
            const text = textarea.value.trim();
            if (!text) {
                textarea.remove();
                if (span && document.body.contains(span)) {
                document.body.removeChild(span);
                }
                return;
            }
            if (!span) {
                throw new Error("Span is null");
            }
            this.activeTextarea=null;
            this.activeTextPosition=null
            const shape: Shape = {
                id: uuidv4(),
                type: 'text',
                text,
                startX: x,
                startY: y,
                height: textarea.offsetHeight-TEXT_ADJUSTED_HEIGHT,
                width: textarea.offsetWidth
            }
            this.existingShape.push(shape);
            this.undoStack.push({
                operationType: "DELETE",
                shape
            })
            this.saveStateToLocalStorage()
            this.socket.send(JSON.stringify({
                type: WsMessageType.DRAW,
                id: shape.id,
                message: JSON.stringify(shape),
                roomId: this.roomId
            }))
            if (textEditorContainer?.contains(textarea)) {
                textEditorContainer?.removeChild(textarea);
                if (span && document.body.contains(span)) {
                document.body.removeChild(span);
                }
            }
            this.clearCanvas();
            hasUnsavedChanges=false;
        }
        textarea.addEventListener("input", () => {
            hasUnsavedChanges = true;
        });
        textarea.addEventListener("keydown",(e)=>{
            if (e.key==="Enter" && (e.ctrlKey)) {
                save();
            }
        })
        const handleClickOutside = (e: MouseEvent) => {
            if (!textarea.contains(e.target as Node)) {
                document.removeEventListener("mousedown", handleClickOutside);
                save();
            }
        };
        setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 100);
        textarea.addEventListener("blur", () => {
            document.removeEventListener("mousedown", handleClickOutside);
            if (hasUnsavedChanges) {
                save();
            }
        });
    }
    mousedown = (e:MouseEvent)=>{
        
        if (this.selectedTool === 'selection') {
            const { x, y } = this.transformPanScale(e.clientX, e.clientY);
            console.log("down");
            if (this.selectedShapeUUID) {
                const shape1 = this.existingShape.find(s=>s.id===this.selectedShapeUUID)!
                console.log(shape1);
                this.undoStack.push({
                        operationType: "UPDATE",
                        shape: { ...shape1 }
                    })
                 console.log(this.undoStack);
                 
                const handle = this.getHandleAtPosition(x,y);
                if (handle) {
                    this.isDraggingShape=false;
                    this.activeHandle=handle
                    const shape = this.existingShape.find(s => s.id === this.selectedShapeUUID)!;
                    
                    this.resizeInitialBounds = getShapeBounds(shape);
                    return;
                }
                const selectedShape = this.existingShape.find(s=> s.id==this.selectedShapeUUID)
                if (selectedShape) {
                    const bound = getShapeBounds(selectedShape);
                    if(x>=bound.x && x<=(bound.x+bound.width) && y>=bound.y && y<=(bound.y+bound.height)){
                        this.isDraggingShape =true;
                        this.activeHandle=null;
                        this.draggingOffsetX = x-bound.x
                        this.draggingOffsetY= y-bound.y
                        this.clearCanvas();
                        return;
                    }
                }
            }
            const clickedShapeUUID = this.getShapeUUIDAtPosition(x, y);
            // console.log(clickedShapeUUID);
            
            this.selectedShapeUUID = clickedShapeUUID;
            if (!clickedShapeUUID) {
                this.selectedShapeUUID=null;
            }
            this.redrawInteractionLayer();
            return; 
        }
        this.clicked=true;
        const {x,y} = this.transformPanScale(e.clientX,e.clientY)
        this.startX = x;
        this.startY = y;
        this.drawingShapeId = uuidv4();
        if (this.selectedTool=="pan") {
            this.isDragging=true;
            this.clicked=false
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        }
        if (this.selectedTool=="pencil") {
            this.points = [];
            this.points.push([x,y])
        }
        if (this.selectedTool=="text") {
            this.clicked=false
            this.handleText(e)
        }
    }

    mouseup = (e:MouseEvent)=>{
        if (this.activeHandle) {
            this.saveStateToLocalStorage();
            const resizedShape = this.existingShape.find(s => s.id === this.selectedShapeUUID);
            if (resizedShape) {
                this.socket.send(JSON.stringify({
                    type: WsMessageType.UPDATE,
                    id: resizedShape.id,
                    message: JSON.stringify(resizedShape),
                    roomId: this.roomId
                }));
            }
            this.activeHandle=null;
            this.resizeInitialBounds=null;
            this.clearCanvas();
            this.redrawInteractionLayer();
            return;
        }
        if (this.isDraggingShape) {
            this.isDraggingShape=false
            const shape = this.existingShape.find(s => s.id === this.selectedShapeUUID);
            if (!shape) {
                return
            }
            this.saveStateToLocalStorage()
            this.socket.send(JSON.stringify({
                type:WsMessageType.UPDATE,
                id: shape.id,
                message: JSON.stringify(shape),
                roomId: this.roomId
            }))
            this.clearCanvas();
            return;
        }
        this.clicked = false;
        this.drawingShapeId = null;
        this.isDragging = false;
        const {x ,y} = this.transformPanScale(e.clientX,e.clientY)
        // const width = e.clientX-this.startX
        // const height = e.clientY-this.startY
        const width = x-this.startX
        const height = y-this.startY
        const selectedTool = this.selectedTool;
        let shape: Shape | null = null;
        if (selectedTool=='rect') {
            shape = {
                id: uuidv4(),
                type: "rect",
                x: this.startX,
                y: this.startY,
                width,
                height,
            }
        }else if (selectedTool==="circle"){
            const radiusY = height/2;
            const radiusX = width/2;
            shape = {
                id: uuidv4(),
                type:  "circle",
                radiusX,
                radiusY,
                centerX: this.startX+ radiusX,
                centerY: this.startY+radiusY
            }
        }else if (selectedTool=="line"){
            shape = {
                id: uuidv4(),
                type: 'line',
                startX: this.startX,
                startY: this.startY,
                endX: x,
                endY: y
            }
        }else if (selectedTool=="rhombus"){
            shape = {
                id: uuidv4(),
                type: 'rhombus',
                topX: this.startX+width/2,
                topY: this.startY,
                rightX: this.startX + width,
                rightY: this.startY + height / 2,
                bottomX: this.startX+width/2,
                bottomY: this.startY+height,
                leftX: this.startX,
                leftY: this.startY+height/2
            }
        }else if (selectedTool=="arrow"){
            shape = {
                id: uuidv4(),
                type: 'arrow',
                fromX: this.startX,
                fromY: this.startY,
                toX: x,
                toY: y
            }
        }else if(selectedTool=="pencil"){
            this.points.push([x,y])
            shape = {
                id: uuidv4(),
                type: "pencil",
                points: this.points
            }
        }
        if(!shape) return
        this.existingShape.push(shape)
        this.undoStack.push({
                operationType: "DELETE",
                shape
        })
        this.saveStateToLocalStorage()
        this.clearCanvas();
        this.socket.send(JSON.stringify({
                type:WsMessageType.DRAW,
                id: shape.id,
                message: JSON.stringify(shape),
                roomId: this.roomId
        }))
    }

    mousemove = (e:MouseEvent)=>{
        const {x ,y} = this.transformPanScale(e.clientX,e.clientY)
        if (this.activeHandle && this.selectedShapeUUID && this.resizeInitialBounds) {
            const shape = this.existingShape.find(s => s.id === this.selectedShapeUUID);
            if (!shape) {
                return
            }
            this.resizeShape(shape,this.activeHandle,x,y,this.resizeInitialBounds)
            this.clearCanvas();
            this.redrawInteractionLayer();
            return;
        }
        if (this.isDraggingShape && this.selectedShapeUUID) {
            const selectedShape = this.existingShape.find(s => s.id === this.selectedShapeUUID);
            if (!selectedShape) return;
            const newX = x - this.draggingOffsetX;
            const newY = y - this.draggingOffsetY;
            const bounds = getShapeBounds(selectedShape);
            const dx = newX - bounds.x;
            const dy = newY - bounds.y;
            translateShape(selectedShape, dx, dy);
            this.throttledSendDraggingUpdate(selectedShape);
            this.redrawInteractionLayer();
            return;
        }
        if (this.clicked) {
            const width = x-this.startX
            const height = y-this.startY
            this.clearCanvas();
            this.ctx.save();
            this.ctx.setTransform(this.zoomlevel, 0, 0, this.zoomlevel, this.offsetX, this.offsetY);
            this.ctx.strokeStyle= 'rgba(255,255,255)'
            const selectedTool:Tool = this.selectedTool!;
            // console.log("selectedTool",selectedTool);
            if (!selectedTool) {
                return
            }
            let shape:Shape | null = null;
            if (selectedTool=='rect') {                
                shape = {
                    id: null,
                    type: "rect",
                    x: this.startX,
                    y: this.startY,
                    width,
                    height
                }
            }else if (selectedTool==="circle"){
                const radiusY = height/2;
                const radiusX = width/2;
                shape = {
                    id: null,
                    type:  "circle",
                    radiusX,
                    radiusY,
                    centerX: this.startX+ radiusX,
                    centerY: this.startY+radiusY
                }
            }else if (selectedTool=="line"){
                shape = {
                    id: null,
                    type: 'line',
                    startX: this.startX,
                    startY: this.startY,
                    endX: x,
                    endY: y
                }
            }else if (selectedTool=="rhombus"){
                shape = {
                    id: null,
                    type: 'rhombus',
                    topX: this.startX+width/2,
                    topY: this.startY,
                    rightX: this.startX + width,
                    rightY: this.startY + height / 2,
                    bottomX: this.startX+width/2,
                    bottomY: this.startY+height,
                    leftX: this.startX,
                    leftY: this.startY+height/2
                }
            }else if (selectedTool=="arrow"){
                shape = {
                    id: null,
                    type: 'arrow',
                    fromX: this.startX,
                    fromY: this.startY,
                    toX: x,
                    toY: y
                }
            }else if (selectedTool=="pencil") { 
                this.points.push([x,y])
                shape = {
                    id: null,
                    type: "pencil",
                    points: this.points
                }
            }
            if (shape) {
                drawShape(shape,this.ctx);
                shape.id=this.drawingShapeId
                this.throttledSendDrawingUpdate(shape as Shape);
            }
            this.ctx.restore();
        }
        else if (this.isDragging) {
            let dx = e.clientX - this.lastX;
            let dy = e.clientY - this.lastY;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastX = e.clientX;
            this.lastY = e.clientY;

            this.clearCanvas();
        }
        if (!this.clicked && !this.isDragging && this.selectedTool=='selection') {
        const { x, y } = this.transformPanScale(e.clientX, e.clientY);
        const foundUUID = this.getShapeUUIDAtPosition(x, y);
            if (foundUUID !== this.hoveredShapeUUID) {
                this.hoveredShapeUUID = foundUUID;
                this.interactiveCanvas.style.cursor = foundUUID ? 'move' : 'default';
            }
        }
    }
    mousewheel = (e:WheelEvent)=>{
        e.preventDefault(); // Prevent page scrolling
        if (e.ctrlKey) {
            const scaleAmount = 0.1;
            const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
           
            const canvasX = (mouseX - this.offsetX) / this.zoomlevel;
            const canvasY = (mouseY - this.offsetY) / this.zoomlevel;
            if (e.deltaY < 0) { // Zoom in
                this.zoomlevel += scaleAmount;
                if (this.zoomlevel>4) this.zoomlevel = 4; // Prevent excessive zoom out
            } else { // Zoom out
                this.zoomlevel -= scaleAmount;
                if (this.zoomlevel< 0.1) this.zoomlevel = 0.1; // Prevent excessive zoom out
            }
            this.offsetX = mouseX - canvasX * this.zoomlevel;
            this.offsetY = mouseY - canvasY * this.zoomlevel;

            this.onZoomChange(this.zoomlevel);
        }else{
            this.offsetX -= e.deltaX
            this.offsetY -= e.deltaY
        }
        
        
        
        this.clearCanvas();
        this.redrawInteractionLayer();
    } 

    keyDown = (e:KeyboardEvent)=>{
        if (e.key=='Delete') {
            if (this.selectedShapeUUID==null) {
                return
            }
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                return;
            }
            e.preventDefault();
            const indexToRemove = this.existingShape.findIndex(shape => shape.id === this.selectedShapeUUID);
            if (indexToRemove!=-1) {
                this.undoStack.push({
                operationType: "CREATE",
                shape: this.existingShape[indexToRemove]
            })
                this.existingShape.splice(indexToRemove,1);
                this.socket.send(JSON.stringify({
                    type: WsMessageType.ERASE,
                    id: this.selectedShapeUUID,
                    roomId: this.roomId
                }))
            }
            this.clearCanvas();
            this.redrawInteractionLayer();
        }
        if (e.ctrlKey && e.key == 'z') {
            console.log("working");
            console.log(this.undoStack);
            
            if (this.undoStack.length==0) {
                return
            }
            const operation = this.undoStack.pop();
            if (operation) {
                switch (operation.operationType) {
                    case "DELETE":
                        const indexToRemove = this.existingShape.findIndex(shape => shape.id === operation.shape.id);
                        this.existingShape.splice(indexToRemove,1);
                        this.saveStateToLocalStorage();
                        this.clearCanvas();
                        this.socket.send(JSON.stringify({
                            type: WsMessageType.ERASE,
                            id: operation.shape.id,
                            roomId: this.roomId
                        }))
                        break;
                
                    case "CREATE":
                        this.existingShape.push(operation.shape);
                        this.saveStateToLocalStorage();
                        this.clearCanvas();
                        this.socket.send(JSON.stringify({
                                type:WsMessageType.DRAW,
                                id: operation.shape.id,
                                message: JSON.stringify(operation.shape),
                                roomId: this.roomId
                        }))
                        break;
                    case "UPDATE":
                        console.log("update");
                        const findIndex = this.existingShape.findIndex(s=> s.id==operation.shape.id)
                        console.log(findIndex);
                        
                        if (findIndex!=-1) {               
                            console.log("dsadasdas");
                            
                            console.log(this.existingShape[findIndex]);
                            this.existingShape[findIndex] = {...operation.shape};
                            console.log(this.existingShape[findIndex]);
                        }
                        this.clearCanvas();
                        this.redrawInteractionLayer();
                        this.saveStateToLocalStorage();
                        this.socket.send(JSON.stringify({
                                type:WsMessageType.UPDATE,
                                id: operation.shape.id,
                                message: JSON.stringify(operation.shape),
                                roomId: this.roomId
                        }))
                        break;
                    
                    default:
                        break;
                }
            }
        }
    }

    initMouseHandlers(){
        this.interactiveCanvas.addEventListener("mousedown",this.mousedown)

        this.interactiveCanvas.addEventListener("mouseup",this.mouseup)
        
        this.interactiveCanvas.addEventListener("mousemove",this.mousemove)

        this.interactiveCanvas.addEventListener("wheel", this.mousewheel)

        document.addEventListener("keydown",this.keyDown)
    }
    transformPanScale(
    clientX: number,
    clientY: number
    ): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left - this.offsetX) / this.zoomlevel;
        const y = (clientY - rect.top - this.offsetY) / this.zoomlevel;
        return { x, y };
    }
    clearCanvas(){
        console.log(this.undoStack);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(-this.offsetX/this.zoomlevel,-this.offsetY/this.zoomlevel,this.canvas.width/this.zoomlevel,this.canvas.height/this.zoomlevel);
        this.ctx.save();
        this.ctx.setTransform(
            this.zoomlevel,
            0,
            0,
            this.zoomlevel,
            this.offsetX,
            this.offsetY
        )
        this.ctx.fillRect(-this.offsetX/this.zoomlevel,-this.offsetY/this.zoomlevel,this.canvas.width/this.zoomlevel,this.canvas.height/this.zoomlevel);
        // this.ctx.translate(this.offsetX,this.offsetY);
        // this.ctx.scale(this.zoomlevel, this.zoomlevel);
        this.existingShape.map(shape=>{
            if (this.isDraggingShape && shape.id==this.selectedShapeUUID) {
            }else{
                drawShape(shape,this.ctx)            
            }

        })
        this.ctx.restore();
    }
    private redrawInteractionLayer() {
        const ctx = this.interactionCtx; 
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.interactiveCanvas.width, this.interactiveCanvas.height);

        ctx.save();
        ctx.setTransform(this.zoomlevel, 0, 0, this.zoomlevel, this.offsetX, this.offsetY);

        for (const shape of this.remotePreviews.values()) {
            if (shape.id !== this.selectedShapeUUID) {
                drawShape(shape, ctx);
            }
        }
        if (this.selectedShapeUUID) {
            const selectedShape = this.existingShape.find(s => s.id === this.selectedShapeUUID);
            if (selectedShape) {
                const bounds = getShapeBounds(selectedShape);
                const worldPadding = SELECTION_PADDING_PX / this.zoomlevel;
                ctx.strokeStyle = 'rgb(30, 144, 255)';
                ctx.lineWidth = 2/this.zoomlevel;;
                ctx.strokeRect(bounds.x-worldPadding, bounds.y-worldPadding, bounds.width+(worldPadding*2), bounds.height+(worldPadding*2));
                if (this.isDraggingShape) {
                    drawShape(selectedShape,this.interactionCtx)                
                }
                const handleSizeWorld = HANDLE_SIZE_PX / this.zoomlevel;
                ctx.fillStyle = 'rgb(30, 144, 255)';
                if (selectedShape.type!='pencil') {
                    const handles = this.getHandlePositions(bounds);
                    for (const handle of Object.values(handles)) {
                        ctx.fillRect(
                            handle.x - handleSizeWorld / 2,
                            handle.y - handleSizeWorld / 2,
                            handleSizeWorld,
                            handleSizeWorld
                        );
                    } 
                }
            }
            
        }
        ctx.restore();

    }
    private getShapeUUIDAtPosition(clickX: number, clickY: number): string | null {
        const worldTolerance = SELECTION_TOLERENCE_PX / this.zoomlevel;
        const clickPoint = { x: clickX, y: clickY };

        // -----------------------------------------------------------------
        // ## BROAD PHASE ##
        // Create the small query box around the mouse cursor.
        // -----------------------------------------------------------------
        const queryBox = {
            x: clickX - worldTolerance,
            y: clickY - worldTolerance,
            width: worldTolerance * 2,
            height: worldTolerance * 2
        };
        const candidates = this.existingShape.filter(shape => 
            doBoxesIntersect(queryBox, getShapeBounds(shape))
        );
        if (candidates.length === 0) {
            return null;
        }

        // -----------------------------------------------------------------
        // ## NARROW PHASE ##
        // Now, run the precise distance check ONLY on the few candidates we found.
        // -----------------------------------------------------------------
        let proximityMatch: { uuid: string | null, distance: number } = { uuid: null, distance: Infinity };
        let directHitUUID: string | null = null;
        for (let i = candidates.length - 1; i >= 0; i--) {
            const shape = candidates[i];
            const distance = getDistanceToShapeOutline(clickPoint, shape);

            if (distance < 1e-6) {
                directHitUUID = shape.id;
                break; 
            }

            if (distance < proximityMatch.distance) {
                proximityMatch = { uuid: shape.id, distance };
            }
        }
        if (directHitUUID) {
            return directHitUUID;
        }

        if (proximityMatch.distance < worldTolerance) {
            return proximityMatch.uuid;
        }

        return null;
    }
    private getHandlePositions(bounds: { x: number, y: number, width: number, height: number }) {
        const selectionTolerance = (SELECTION_TOLERENCE_PX)/this.zoomlevel
        return {
            'top-left':     { x: bounds.x - selectionTolerance, y:bounds.y - selectionTolerance },
            'top-right':    { x: bounds.x + selectionTolerance + bounds.width, y: bounds.y - selectionTolerance },
            'bottom-left':  { x: bounds.x - selectionTolerance, y: bounds.y + bounds.height + selectionTolerance },
            'bottom-right': { x: bounds.x + bounds.width + selectionTolerance, y: bounds.y + bounds.height + selectionTolerance },
            'top':          { x: bounds.x - selectionTolerance + bounds.width / 2, y: bounds.y - selectionTolerance },
            'bottom':       { x: bounds.x - selectionTolerance + bounds.width / 2, y: bounds.y + bounds.height + selectionTolerance },
            'left':         { x: bounds.x - selectionTolerance, y: bounds.y - selectionTolerance + bounds.height / 2 },
            'right':        { x: bounds.x + selectionTolerance + bounds.width, y: bounds.y - selectionTolerance + bounds.height / 2 },
        };
    }
    private getHandleAtPosition(worldX: number, worldY: number): HandleType | null {
        if (!this.selectedShapeUUID) return null;
        const shape = this.existingShape.find(s => s.id === this.selectedShapeUUID);
        if (!shape) return null;

        const bounds = getShapeBounds(shape);
        const handles = this.getHandlePositions(bounds);
        const handleSizeWorld = HANDLE_SIZE_PX / this.zoomlevel;
        for (const [type, pos] of Object.entries(handles)) {
            if (
                worldX >= pos.x - handleSizeWorld / 2 && worldX <= pos.x + handleSizeWorld / 2 &&
                worldY >= pos.y - handleSizeWorld / 2 && worldY <= pos.y + handleSizeWorld / 2
            ) {
                return type as HandleType;
            }
        }
        return null;
    }
    private resizeShape(
    shape: Shape,
    handle: HandleType,
    mouseX: number,
    mouseY: number,
    initialBounds: { x: number; y: number; width: number; height: number }
    ) {
        let newBounds = { ...initialBounds };
        switch (handle) {
            case 'bottom-right':
                newBounds.width = mouseX - initialBounds.x;
                newBounds.height = mouseY - initialBounds.y;
                break;
            case 'top-left':
                newBounds.width = (initialBounds.x + initialBounds.width) - mouseX;
                newBounds.height = (initialBounds.y + initialBounds.height) - mouseY;
                newBounds.x = mouseX;
                newBounds.y = mouseY;
                break;
            case 'top-right':
                newBounds.width = mouseX - initialBounds.x;
                newBounds.height = (initialBounds.y + initialBounds.height) - mouseY;
                newBounds.y = mouseY;
                break;
            case 'bottom-left':
                newBounds.width = (initialBounds.x + initialBounds.width) - mouseX;
                newBounds.height = mouseY - initialBounds.y;
                newBounds.x = mouseX;
                break;
            case 'top':
                newBounds.height = (initialBounds.y + initialBounds.height) - mouseY;
                newBounds.y = mouseY;
                break;
            case 'bottom':
                newBounds.height = mouseY - initialBounds.y;
                break;
            case 'left':
                newBounds.width = (initialBounds.x + initialBounds.width) - mouseX;
                newBounds.x = mouseX;
                break;
            case 'right':
                newBounds.width = mouseX - initialBounds.x;
                break;
        }
    
        if (newBounds.width < 0) {
            newBounds.x = newBounds.x + newBounds.width;
            newBounds.width = Math.abs(newBounds.width);
        }
        if (newBounds.height < 0) {
            newBounds.y = newBounds.y + newBounds.height;
            newBounds.height = Math.abs(newBounds.height);
        }

        switch (shape.type) {
            case 'rect':
                shape.x = newBounds.x;
                shape.y = newBounds.y;
                shape.width = newBounds.width;
                shape.height = newBounds.height;
                break;
            case 'text':
                shape.startX = newBounds.x;
                shape.startY = newBounds.y;
                shape.width = newBounds.width;
                shape.height = newBounds.height;
                break;
            case 'circle':
                shape.centerX = newBounds.x + newBounds.width / 2;
                shape.centerY = newBounds.y + newBounds.height / 2;
                shape.radiusX = newBounds.width / 2;
                shape.radiusY = newBounds.height / 2;
                break;

            case 'line':
                shape.startX = newBounds.x;
                shape.startY = newBounds.y;
                shape.endX = newBounds.x + newBounds.width;
                shape.endY = newBounds.y + newBounds.height;
                break;
                
            case 'arrow':
                shape.fromX = newBounds.x;
                shape.fromY = newBounds.y;
                shape.toX = newBounds.x + newBounds.width;
                shape.toY = newBounds.y + newBounds.height;
                break;
            
            case 'rhombus':
                shape.topX = newBounds.x + newBounds.width / 2;
                shape.topY = newBounds.y;
                shape.rightX = newBounds.x + newBounds.width;
                shape.rightY = newBounds.y + newBounds.height / 2;
                shape.bottomX = newBounds.x + newBounds.width / 2;
                shape.bottomY = newBounds.y + newBounds.height;
                shape.leftX = newBounds.x;
                shape.leftY = newBounds.y + newBounds.height / 2;
                break;
        }
    }
}
function drawShape(shape:Shape,ctx:CanvasRenderingContext2D){
    ctx.strokeStyle = 'rgba(255, 255, 255)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 255, 255)';
    if (shape.type=='rect') {     
        ctx.beginPath()
        ctx.roundRect(shape.x,shape.y,shape.width,shape.height,calculateRoundedCornerRadius(Math.min(shape.width,shape.height)))
        ctx.stroke();
    }else if(shape.type=="circle"){
        ctx.beginPath();
        ctx.ellipse(shape.centerX, shape.centerY, Math.abs(shape.radiusX), Math.abs(shape.radiusY), 0, 0, 2* Math.PI, false);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }else if(shape.type=="line"){
        ctx.beginPath();
        ctx.moveTo(shape.startX,shape.startY); 
        ctx.lineTo(shape.endX,shape.endY); 
        ctx.stroke(); 
    }else if(shape.type=="rhombus"){
        
        ctx.beginPath();
        //plain rhombus
        ctx.moveTo(shape.topX,shape.topY)
        ctx.lineTo(shape.rightX,shape.rightY)
        ctx.lineTo(shape.bottomX,shape.bottomY);
        ctx.lineTo(shape.leftX, shape.leftY);
        ctx.lineTo(shape.topX,shape.topY)


        //curved rhombus
        // const radius = calculateRoundedCornerRadius(Math.min(width,height));
        // this.ctx.moveTo(this.startX+width/2-radius,this.startY)
        // this.ctx.arcTo(this.startX+width/2,this.startY,x1,y1,radius)
        // this.ctx.arcTo(x1,y1,this.startX+width/2,this.startY+height,radius)
        // this.ctx.arcTo(this.startX+width/2,this.startY+height,this.startX, this.startY+height/2,radius)
        // this.ctx.arcTo(this.startX, this.startY+height/2,this.startX+width/2-radius,this.startY-radius,radius)
        ctx.closePath();
        ctx.stroke();
    }else if (shape.type==="arrow") {
        // console.log(shape);
        ctx.beginPath();
        ctx.moveTo(shape.fromX, shape.fromY);
        ctx.lineTo(shape.toX, shape.toY);
        ctx.stroke();
        const angle = Math.atan2(shape.toY-shape.fromY,shape.toX-shape.fromX)
        ctx.beginPath();
        const arrowLength = Math.abs(shape.toX-shape.fromX)<50?Math.abs(shape.toX-shape.fromX)/3:15;
        ctx.moveTo(shape.toX, shape.toY);
        ctx.lineTo(
            shape.toX - arrowLength * Math.cos(angle - Math.PI / 6),
            shape.toY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(shape.toX, shape.toY);
        ctx.lineTo(
            shape.toX - arrowLength * Math.cos(angle + Math.PI / 6),
            shape.toY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }else if(shape.type=="pencil"){
        //using a library

        const stroke = getStroke(shape.points,{
            size: 8,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
        });
        const pathData = getSvgPathFromStroke(stroke);
        ctx.beginPath();
        ctx.fillStyle="rgba(255,255,255)"
        ctx.fill(new Path2D(pathData));
        ctx.closePath();



        //manual

        // ctx.lineJoin = 'round';
        // ctx.lineCap = 'round';
        // for (let i = 0; i < shape.clickX.length; i++) {
        //     if (!shape.dragging[i] && i == 0) {
        //     ctx.beginPath();
        //     ctx.moveTo(shape.clickX[i], shape.clickY[i]);
        //     ctx.stroke();
        // } else if (!shape.dragging[i] && i > 0) {
        //     ctx.closePath();

        //     ctx.beginPath();
        //     ctx.moveTo(shape.clickX[i], shape.clickY[i]);
        //     ctx.stroke();
        // } else {
        //     ctx.lineTo(shape.clickX[i], shape.clickY[i]);
        //     ctx.stroke();
        // }
            
        // }
    }else if (shape.type=="text") {
        ctx.font="20px sans-serif";
        ctx.fillStyle= "rgba(255,255,255)"
        const lines = shape.text.split("\n");
        lines.forEach((line,index)=>{
            const ty = shape.startY+(index+1)*(20)*1.2;
            ctx.fillText(line,shape.startX,ty)
        })
        // ctx.fillText(shape.text,shape.startX,shape.startY,shape.width)
    }
}
function getShapeBounds(shape:Shape): {x:number,y:number,width:number,height:number}{
    switch (shape.type) {
        case "rect":{
            const x = shape.width>=0?shape.x:shape.x+shape.width;
            const y = shape.height>=0?shape.y:shape.y+shape.height;
            const width = Math.abs(shape.width);
            const height = Math.abs(shape.height);
            return {x,y,width,height};
        }
        case "circle":{
            const radiusX = Math.abs(shape.radiusX);
            const radiusY = Math.abs(shape.radiusY);
            return {
                x: shape.centerX-radiusX,
                y: shape.centerY-radiusY,
                width: radiusX*2,
                height: radiusY*2
            };
        }
        case "arrow":
        case "line" :{
            const fromX = shape.type === 'line' ? shape.startX : shape.fromX;
            const fromY = shape.type === 'line' ? shape.startY : shape.fromY;
            const toX = shape.type === 'line' ? shape.endX : shape.toX;
            const toY = shape.type === 'line' ? shape.endY : shape.toY;

            const minX = Math.min(fromX, toX);
            const minY = Math.min(fromY, toY);
            const maxX = Math.max(fromX, toX);
            const maxY = Math.max(fromY, toY);
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        case "rhombus": {
            const minX = Math.min(shape.leftX, shape.rightX);
            const minY = Math.min(shape.topY, shape.bottomY);
            const maxX = Math.max(shape.leftX, shape.rightX);
            const maxY = Math.max(shape.topY, shape.bottomY);
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }

        case "pencil": {
            if (shape.points.length === 0) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            for (const point of shape.points) {
                minX = Math.min(minX, point[0]);
                minY = Math.min(minY, point[1]);
                maxX = Math.max(maxX, point[0]);
                maxY = Math.max(maxY, point[1]);
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        
        case "text": {
            return { x: shape.startX, y: shape.startY, width: shape.width, height: shape.height };
        }
        default:
            return {x:0,y:0,width:0,height: 0};
    }
}

function getDistanceToShapeOutline(point: {x: number, y: number}, shape: Shape): number {
    switch (shape.type) {
        case "rect": {
            // A rectangle's outline is its four sides. We find the shortest
            // distance to any of the four line segments that make up the rectangle.
            const bounds = getShapeBounds(shape); // Use bounds to handle negative width/height
            const p1 = { x: bounds.x, y: bounds.y };
            const p2 = { x: bounds.x + bounds.width, y: bounds.y };
            const p3 = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
            const p4 = { x: bounds.x, y: bounds.y + bounds.height };
            
            return Math.min(
                distanceToLineSegment(point, p1, p2),
                distanceToLineSegment(point, p2, p3),
                distanceToLineSegment(point, p3, p4),
                distanceToLineSegment(point, p4, p1)
            );
        }

        case "line": {
            const start = { x: shape.startX, y: shape.startY };
            const end = { x: shape.endX, y: shape.endY };
            return distanceToLineSegment(point, start, end);
        }

        case "arrow": {
            const start = { x: shape.fromX, y: shape.fromY };
            const end = { x: shape.toX, y: shape.toY };
            return distanceToLineSegment(point, start, end);
        }

        case "rhombus": {
            const p1 = { x: shape.topX, y: shape.topY };
            const p2 = { x: shape.rightX, y: shape.rightY };
            const p3 = { x: shape.bottomX, y: shape.bottomY };
            const p4 = { x: shape.leftX, y: shape.leftY };

            return Math.min(
                distanceToLineSegment(point, p1, p2),
                distanceToLineSegment(point, p2, p3),
                distanceToLineSegment(point, p3, p4),
                distanceToLineSegment(point, p4, p1)
            );
        }

        case "circle": {
            const dx = point.x - shape.centerX;
            const dy = point.y - shape.centerY;
            const rx = Math.abs(shape.radiusX);
            const ry = Math.abs(shape.radiusY);
            if (rx === 0 || ry === 0) {
                return Infinity;
            }
            const value = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
            const angle = Math.atan2(dy, dx);
            const tolerance = 0.2; 
            if (value >= (1 - tolerance) && value <= (1 + tolerance)) {
                return 0; // It's a hit! Return 0 so it gets selected.
            }
            return Infinity; ;
        }

        case "pencil": {
            if (shape.points.length < 2) return Infinity;

            let minDistance = Infinity;
            for (let i = 0; i < shape.points.length - 1; i++) {
                const p1 = { x: shape.points[i][0], y: shape.points[i][1] };
                const p2 = { x: shape.points[i+1][0], y: shape.points[i+1][1] };
                const distance = distanceToLineSegment(point, p1, p2);
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
            return minDistance;
        }

        case "text": {
            const bounds = getShapeBounds(shape);
            const p1 = { x: bounds.x, y: bounds.y };
            const p2 = { x: bounds.x + bounds.width, y: bounds.y };
            const p3 = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
            const p4 = { x: bounds.x, y: bounds.y + bounds.height };
            
            return Math.min(
                distanceToLineSegment(point, p1, p2),
                distanceToLineSegment(point, p2, p3),
                distanceToLineSegment(point, p3, p4),
                distanceToLineSegment(point, p4, p1)
            );
        }
        default:
            return Infinity;
    }
}
function distanceToLineSegment(
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
): number {
    const L2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
    if (L2 === 0) {
        return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
    }
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2;
    t = Math.max(0, Math.min(1, t));
    const closestPoint = {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y)
    };
    const dx = p.x - closestPoint.x;
    const dy = p.y - closestPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function doBoxesIntersect(boxA:{
    x: number;
    y: number;
    width: number;
    height: number;
}, boxB:{
    x: number;
    y: number;
    width: number;
    height: number;
}) {
    return (
        boxA.x < boxB.x + boxB.width &&
        boxA.x + boxA.width > boxB.x &&
        boxA.y < boxB.y + boxB.height &&
        boxA.y + boxA.height > boxB.y
    );
}

function translateShape(shape: Shape,dx:number,dy:number) {
    switch (shape.type) {
        case "rect":
            shape.x += dx;
            shape.y += dy;
            break;
        case "circle":
            shape.centerX +=dx
            shape.centerY +=dy
            break;
        case "line":
            shape.startX+=dx
            shape.startY+=dy
            shape.endX+=dx
            shape.endY+=dy
            break
        case "arrow":
            shape.fromX+=dx
            shape.fromY+=dy
            shape.toX+=dx
            shape.toY+=dy
            break
        case "pencil":
            shape.points.forEach(cord=> {
                cord[0]+=dx
                cord[1]+=dy
            })
            break;
        case "text":
            shape.startX+=dx
            shape.startY+=dy
            break;
        case "rhombus":
            shape.leftX+=dx
            shape.leftY+=dy
            shape.topX+=dx
            shape.topY+=dy
            shape.rightX+=dx
            shape.rightY+=dy
            shape.bottomX+=dx
            shape.bottomY+=dy
            break;
        default:
            break;
    }
}
