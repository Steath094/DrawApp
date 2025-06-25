import { BACKEND_URL } from "@/app/config"
import axios from "axios"

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
}



export async function initDraw(canvas: HTMLCanvasElement,roomId:number,socket: WebSocket){
    const ctx = canvas.getContext("2d")
    if (!ctx) {
        return
    }

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type=="chat") {
            const parsedShape = JSON.parse(message.message)
            existingShape.push(parsedShape)
            clearCanvas(existingShape,canvas,ctx)

        }
    }
    let clicked = false;
    let startX = 0;
    let startY = 0;
    let existingShape: Shape[]= await getExistingShape(roomId);
    console.log(existingShape);
    
    clearCanvas(existingShape,canvas,ctx)
    canvas.addEventListener("mousedown",(e)=>{
        clicked = true;
        startX = e.clientX;
        startY = e.clientY;
        
    })
    canvas.addEventListener("mouseup",(e)=>{
        clicked = false;
        const width = e.clientX-startX
        const height = e.clientY-startY
        const shape = {
            type: "rect",
            x: startX,
            y: startY,
            width,
            height
        }
        existingShape.push(shape as unknown as Shape)

        socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify(shape),
            roomId
        }))
    })
    canvas.addEventListener("mousemove",(e)=>{
        if (clicked) {
            const width = e.clientX-startX
            const height = e.clientY-startY
            clearCanvas(existingShape,canvas,ctx);
            ctx.strokeStyle= 'rgba(255,255,255)'
            ctx.strokeRect(startX,startY,width,height);
        }
    })
}

function clearCanvas(existingShape:Shape[],canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D) {
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle= "rgba(0,0,0)"
    ctx.fillRect(0,0,canvas.width,canvas.height)

    existingShape.map(shape=>{
        console.log('shape',shape);
        if (shape.type=='rect') {
            console.log(true);
            ctx.strokeStyle= 'rgba(255,255,255)'
            ctx.strokeRect(shape.x,shape.y,shape.width,shape.height)
        }
    })
}


async function getExistingShape(roomId:number) {
    const res = await axios.get(`${BACKEND_URL}/chat/${roomId}`)
    const messages = res.data.messages;
    const shapes = messages.map((x:{message:string})=>{
        const messageData = JSON.parse(x.message);
        return messageData;
    })
    return shapes;
}