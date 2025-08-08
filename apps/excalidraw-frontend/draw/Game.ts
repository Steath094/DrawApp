import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";
import getStroke from "perfect-freehand";
import { getSvgPathFromStroke, calculateRoundedCornerRadius } from "./Util";
import { TEXT_ADJUSTED_HEIGHT, TEXT_ADJUSTED_WIDTH } from "./constants";
import { v4 as uuidv4 } from "uuid";
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

export class Game {
    private canvas:HTMLCanvasElement;
    private ctx:CanvasRenderingContext2D;
    private existingShape: Shape[];
    private roomId: number;
    private clicked :boolean;
    private startX = 0;
    private startY = 0;
    private points: number[][];
    private selectedTool:Tool = 'rect';
    socket: WebSocket;
    private zoomlevel: number;
    private offsetX: number;
    private offsetY: number;
    private isDragging = false;
    private lastX=0;
    private lastY=0;
    private activeTextarea: HTMLTextAreaElement | null = null;
    private activeTextPosition: { x: number; y: number } | null = null;

    constructor(canvas: HTMLCanvasElement,roomId:number,socket:WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.existingShape = [];
        this.roomId = roomId;
        this.socket=socket
        this.clicked=false;
        this.points = [];
        this.zoomlevel=1;
        this.offsetX=0;
        this.offsetY=0;
        this.init();
        this.initHandlers()
        this.initMouseHandlers()
    }
    destroy(){
        this.canvas.removeEventListener("mousedown",this.mousedown)

        this.canvas.removeEventListener("mouseup",this.mouseup)
        
        this.canvas.removeEventListener("mousemove",this.mousemove)

        this.canvas.removeEventListener("wheel",this.mousewheel)
    }
    setTool(tool:Tool){
        this.selectedTool= tool;
    }
    async init(){
        this.existingShape = await getExistingShapes(this.roomId);
        this.clearCanvas();
    }
    initHandlers(){
        this.socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type=="chat") {
            const parsedShape = JSON.parse(message.message)
            this.existingShape.push(parsedShape)
            this.clearCanvas()
            }
        }
    }
    private handleText(e:MouseEvent){
        const { x, y } = this.transformPanScale(e.clientX, e.clientY);
        console.log("worked");
        
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
            this.socket.send(JSON.stringify({
                type: "chat",
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
        this.clicked=true;
        const {x,y} = this.transformPanScale(e.clientX,e.clientY)
        this.startX = x;
        this.startY = y;
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
        this.clicked = false;
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
        this.clearCanvas();
        this.socket.send(JSON.stringify({
                type: "chat",
                message: JSON.stringify(shape),
                roomId: this.roomId
        }))
    }

    mousemove = (e:MouseEvent)=>{
        const {x ,y} = this.transformPanScale(e.clientX,e.clientY)
        if (this.clicked) {
            const width = x-this.startX
            const height = y-this.startY
            this.clearCanvas();
            this.ctx.save();
        this.ctx.setTransform(this.zoomlevel, 0, 0, this.zoomlevel, this.offsetX, this.offsetY);
            this.ctx.strokeStyle= 'rgba(255,255,255)'
            const selectedTool:Tool = this.selectedTool!;
            console.log("selectedTool",selectedTool);
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
        }else{
            this.offsetX -= e.deltaX
            this.offsetY -= e.deltaY
        }
        
        
        
        this.clearCanvas();
    } 
    initMouseHandlers(){
        this.canvas.addEventListener("mousedown",this.mousedown)

        this.canvas.addEventListener("mouseup",this.mouseup)
        
        this.canvas.addEventListener("mousemove",this.mousemove)

        this.canvas.addEventListener("wheel", this.mousewheel)
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
            drawShape(shape,this.ctx)
        })
        this.ctx.restore();
    }
}
function drawShape(shape:Shape,ctx:CanvasRenderingContext2D){
    if (shape.type=='rect') {
        ctx.strokeStyle= 'rgba(255,255,255)'      
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
        ctx.moveTo(shape.rightX,shape.rightY)
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
