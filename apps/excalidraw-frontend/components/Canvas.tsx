import React, { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import { Game } from "@/canvasGraphics/Game";
import { useWindowSize } from "@/customHooks/useWindowSize";
import { ToolBar } from "./ToolBar";
import { ZoomBar } from "./ZoomBar";
import { StackBar } from "./StackBar";

export type Tool = "lock" | "selection" | "pan" | "circle" | "rect" | "pencil" | "rhombus" | "arrow" | "line" | "text";
export default function Canvas({
  roomId,
  socket,
}: {
  roomId: number;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interativeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [game,setGame] = useState<Game>()
  const [selectedTool, setSelectedTool] = useState<Tool>("selection");
  const [zoomLevel, setZoomLevel] = useState(1);
  const {width,height} = useWindowSize();  
  useEffect(() => {
    //@ts-ignore
    game?.setTool(selectedTool);
  }, [selectedTool,game]);
  useEffect(() => {
    if (canvasRef.current && interativeCanvasRef.current) {
      const g = new Game(canvasRef.current,interativeCanvasRef.current,roomId,socket,(newZoom) => setZoomLevel(newZoom))
      setGame(g);
      return () =>{
        g.destroy();
      }
    }
  }, [canvasRef]);
  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
      }}
      className="relative"
    >
      <div className="textEditorContainer"></div>
      <canvas
        id="static-canvas"
        ref={canvasRef}
        className="absolute top-0 left-0 border-2 border-black bg-[#121212] z-10"
        height={width}
        width={height}
      ></canvas>
      <canvas
        id="interaction-canvas"
        ref={interativeCanvasRef}
        className="absolute top-0 left-0 bg-transparent z-20"
        height={width}
        width={height}
      ></canvas>
      <ToolBar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
      <ZoomBar value={Math.round(zoomLevel * 100)} setZoom={(positive) => game?.setZoom(positive)}/>

      <StackBar callUndo={()=>{game?.callUndo()!}} callRedo={()=>{game?.callRedo()!}} />
    </div>
  );
}


