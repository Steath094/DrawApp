"use client"

import { WS_URL } from "@/app/config";
import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react"
import Canvas from "./Canvas";
import { WsMessageType } from "@/canvasGraphics/constants";

export function RoomCanvas({roomId}:{roomId:number}){
    const [socket,setSocket] = useState<WebSocket | null>(null);
    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIyYTkxOGFlLWE5MTEtNDIxYi05NmYxLTc2YzJlNjgxMzU5OSIsImlhdCI6MTc1MDYzMDc0Nn0.fgnjcrm-3sZkOlI8L7Q2yPi9s_Eyb154f7HMn2zzjsk`)
        ws.onopen= ()=>{
            setSocket(ws)
            ws.send(JSON.stringify({
                type: WsMessageType.JOIN,
                roomId
            }))
        }
    }, []);

    if (!socket) {
        return <div>
            connecting to server
        </div>
    }
    return (
    <Canvas roomId={roomId} socket={socket}/>
    )
}