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
    <div>
        <canvas ref={canvasRef} className='border-2 border-black' height={700} width={1520} ></canvas>
    </div>
  )
}
