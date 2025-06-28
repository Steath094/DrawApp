import { initDraw } from '@/draw';
import React from 'react'
import { useEffect } from 'react';
import { useRef } from 'react';

export default function Canvas({roomId,socket}: {roomId:number,socket:WebSocket}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            initDraw(canvas,roomId,socket)   
        }
    }, [canvasRef]);
  return (
    <div style={{
      height: "100vh",
      overflow: "hidden"
    }}>
        <canvas ref={canvasRef} className='border-2 border-black' height={window.innerHeight} width={window.innerWidth} ></canvas>
    </div>
  )
}
