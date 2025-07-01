import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";


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
    radius: number
} | {
    type: "pencil",
    startX: number,
    startY: number,
    endX: number,
    endY: number
} | {
    type: "rhomb",
    x: number,
    y: number,
    width: number,
    height: number
}

export class Game {
    private canvas:HTMLCanvasElement;
    private ctx:CanvasRenderingContext2D;
    private existingShape: Shape[];
    private roomId: number;
    private clicked :boolean;
    private startX = 0;
    private startY = 0;
    private selectedTool:Tool = 'rect';
    socket: WebSocket;

    constructor(canvas: HTMLCanvasElement,roomId:number,socket:WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.existingShape = [];
        this.roomId = roomId;
        this.socket=socket
        this.clicked=false;
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
            const radius = Math.max(width,height)/2;
            shape = {
                type:  "circle",
                radius: radius,
                centerX: this.startX+ radius,
                centerY: this.startY+radius
            }
        }else if (selectedTool=="pencil"){
            shape = {
                type: 'pencil',
                startX: this.startX,
                startY: this.startY,
                endX: e.clientX,
                endY: e.clientY
            }
        }
        if(!shape) return
        
        this.existingShape.push(shape)

        // this.socket.send(JSON.stringify({
        //         type: "chat",
        //         message: JSON.stringify(shape),
        //         roomId: this.roomId
        // }))
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
            if (selectedTool === "rect") {
                this.ctx.beginPath();
                // this.ctx.strokeRect(this.startX,this.startY,width,height);
                this.ctx.roundRect(this.startX,this.startY,width,height,[10]);
                this.ctx.stroke();

            }else if(selectedTool==="circle"){
                // console.log("circle working");
                
                const radius = Math.max(width,height)/2;
                const centerX = this.startX + radius;
                const centerY = this.startY + radius;
                this.ctx.beginPath();
                this.ctx.arc(centerX,centerY,radius,0,Math.PI*2);
                this.ctx.stroke();
                this.ctx.closePath();
            }else if(selectedTool==="pencil"){
                // console.log("pencil working");
                
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX,this.startY); 
                this.ctx.lineTo(e.clientX, e.clientY); 
                this.ctx.stroke(); 
                this.ctx.closePath();
            }else if (selectedTool==="rhomb") {
                const radius = calculateRoundedCornerRadius(Math.min(width,height));
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX+width/2+radius,this.startY)
                const x1 = this.startX + width
                const y1 = this.startY + height / 2

                //plain rhombus
                // this.ctx.moveTo(this.startX+width/2,this.startY)
                // this.ctx.lineTo(x1, y1)
                // this.ctx.moveTo(x1, y1)
                // this.ctx.lineTo(this.startX+width/2,this.startY+height);
                // this.ctx.lineTo(this.startX, this.startY+height/2);
                // this.ctx.lineTo(this.startX+width/2,this.startY)


                //curved rhombus
                this.ctx.moveTo(this.startX+width/2-radius,this.startY)
                this.ctx.arcTo(this.startX+width/2,this.startY,x1,y1,radius)
                this.ctx.arcTo(x1,y1,this.startX+width/2,this.startY+height,radius)
                this.ctx.arcTo(this.startX+width/2,this.startY+height,this.startX, this.startY+height/2,radius)
                this.ctx.arcTo(this.startX, this.startY+height/2,this.startX+width/2-radius,this.startY-radius,radius)
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
    }
    initMouseHandlers(){
        this.canvas.addEventListener("mousedown",this.mousedown)

        this.canvas.addEventListener("mouseup",this.mouseup)
        
        this.canvas.addEventListener("mousemove",this.mousemove)
    }

    clearCanvas(){
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
        this.ctx.fillStyle= "rgba(0,0,0)"
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height)

        this.existingShape.map(shape=>{
            if (shape.type=='rect') {
                this.ctx.strokeStyle= 'rgba(255,255,255)'
                this.ctx.beginPath()
                this.ctx.roundRect(shape.x,shape.y,shape.width,shape.height,calculateRoundedCornerRadius(Math.min(shape.width,shape.height)))
                this.ctx.stroke();
            }else if(shape.type=="circle"){
                this.ctx.beginPath();
                this.ctx.arc(shape.centerX,shape.centerY,Math.abs(shape.radius),0,Math.PI*2);
                this.ctx.stroke();
                this.ctx.closePath();
            }else if(shape.type=="pencil"){
                this.ctx.beginPath();
                this.ctx.moveTo(shape.startX,shape.startY); 
                this.ctx.lineTo(shape.endX,shape.endY); 
                this.ctx.stroke(); 
                }
            }
        )
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