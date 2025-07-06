import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";
import getStroke from "perfect-freehand";
import { addInput, getSvgPathFromStroke } from "./Util";

type Shape = {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number
} | {
    type: "circle",
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number
} | {
    type: "line",
    startX: number,
    startY: number,
    endX: number,
    endY: number
} | {
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
    type: "arrow",
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
} | {
    type: "pencil",
    points: number[][]
} | {
    type: "text",
    text: string
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


    constructor(canvas: HTMLCanvasElement,roomId:number,socket:WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.existingShape = [];
        this.roomId = roomId;
        this.socket=socket
        this.clicked=false;
        this.points = [];
        this.init();
        this.initHandlers()
        this.initMouseHandlers()
    }
    destroy(){
        this.canvas.removeEventListener("mousedown",this.mousedown)

        this.canvas.removeEventListener("mouseup",this.mouseup)
        
        this.canvas.removeEventListener("mousemove",this.mousemove)
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

    mousedown = (e:MouseEvent)=>{
        this.clicked=true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        if (this.selectedTool=="pencil") {
            this.points = [];
            this.points.push([e.offsetX,e.offsetY])
        }
    }

    mouseup = (e:MouseEvent)=>{
        this.clicked = false;
        const width = e.clientX-this.startX
        const height = e.clientY-this.startY
        const selectedTool = this.selectedTool;
        let shape: Shape | null = null;
        if (selectedTool=='rect') {
            shape = {
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
                type:  "circle",
                radiusX,
                radiusY,
                centerX: this.startX+ radiusX,
                centerY: this.startY+radiusY
            }
        }else if (selectedTool=="line"){
            shape = {
                type: 'line',
                startX: this.startX,
                startY: this.startY,
                endX: e.clientX,
                endY: e.clientY
            }
        }else if (selectedTool=="rhombus"){
            shape = {
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
                type: 'arrow',
                fromX: this.startX,
                fromY: this.startY,
                toX: e.clientX,
                toY: e.clientY
            }
        }else if(selectedTool=="pencil"){
            this.points.push([e.offsetX,e.offsetY])
            shape = {
                type: "pencil",
                points: this.points
            }
        }else if (selectedTool=="text"){
            addInput(e.offsetX,e.offsetY,false)
        }
        if(!shape) return
        
        this.existingShape.push(shape)

        this.socket.send(JSON.stringify({
                type: "chat",
                message: JSON.stringify(shape),
                roomId: this.roomId
        }))
    }

    mousemove = (e:MouseEvent)=>{
        if (this.clicked) {
            const width = e.clientX-this.startX
            const height = e.clientY-this.startY
            this.clearCanvas();
            this.ctx.strokeStyle= 'rgba(255,255,255)'
            const selectedTool:Tool = this.selectedTool!;
            console.log("selectedTool",selectedTool);
            if (!selectedTool) {
                return
            }
            let shape:Shape | null = null;
            if (selectedTool=='rect') {
                shape = {
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
                    type:  "circle",
                    radiusX,
                    radiusY,
                    centerX: this.startX+ radiusX,
                    centerY: this.startY+radiusY
                }
            }else if (selectedTool=="line"){
                shape = {
                    type: 'line',
                    startX: this.startX,
                    startY: this.startY,
                    endX: e.clientX,
                    endY: e.clientY
                }
            }else if (selectedTool=="rhombus"){
                shape = {
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
                    type: 'arrow',
                    fromX: this.startX,
                    fromY: this.startY,
                    toX: e.clientX,
                    toY: e.clientY
                }
            }else if (selectedTool=="pencil") { 
                this.points.push([e.offsetX,e.offsetY])
                shape = {
                    type: "pencil",
                    points: this.points
                }
            }else if (selectedTool=="text"){
            }
            if (!shape) {
                return
            }
            drawShape(shape,this.ctx);
    }
}
    clickHandler(e:MouseEvent){
        if (this.selectedTool=="text") {
            addInput(e.offsetX,e.offsetY,false)
        }
    }   
    initMouseHandlers(){
        this.canvas.addEventListener("mousedown",this.mousedown)

        this.canvas.addEventListener("mouseup",this.mouseup)
        
        this.canvas.addEventListener("mousemove",this.mousemove)
        this.canvas.addEventListener("click",this.clickHandler)
    }

    clearCanvas(){
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
        this.ctx.fillStyle= "rgba(0,0,0)"
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)

        this.existingShape.map(shape=>{
            drawShape(shape,this.ctx)
        }
        )
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
        console.log(shape);
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
    }
    
}

function calculateRoundedCornerRadius(L_mm: number): number {

  // Step 1: Calculate the scaling factor (G)
  // Formula: G = L / 15
  const G: number = L_mm / 15;
  // Step 2: Calculate the multiplication factor (P)
  // Formula: P = 1.25 + ((G - 2) / 2) * 0.25
  const P: number = 1.25 + ((G - 2) / 2) * 0.25;
  // Step 3: Calculate the rounded corners (r)
  // Formula: r = 4 * P
  const r_mm: number = 4 * P;
  return Math.abs(r_mm);
}

function initMouseHandlers() {
    throw new Error("Function not implemented.");
}
