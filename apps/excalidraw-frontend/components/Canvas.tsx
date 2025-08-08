import React, { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import IconButton from "./IconButton";
import { ArrowUpRight, Circle, Diamond, Hand, LetterTextIcon, MousePointer, PencilIcon, RectangleHorizontal } from "lucide-react";
import { Game } from "@/draw/Game";
import LineIcon from "./Icons/LineIcon";
import { useWindowSize } from "@/customHooks/useWindowSize";

export type Tool = "selection" | "pan" | "circle" | "rect" | "pencil" | "rhombus" | "arrow" | "line" | "text";
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
  const {width,height} = useWindowSize();  
  useEffect(() => {
    //@ts-ignore
    game?.setTool(selectedTool);
    console.log(selectedTool);
    
  }, [selectedTool,game]);
  useEffect(() => {
    if (canvasRef.current && interativeCanvasRef.current) {
      const g = new Game(canvasRef.current,interativeCanvasRef.current,roomId,socket)
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
        className="absolute top-0 left-0 border-2 border-black bg-black z-10"
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
    </div>
  );
}

export function ToolBar({
  selectedTool,
  setSelectedTool
}: {
  selectedTool: Tool;
  setSelectedTool: (s: Tool) => void;
}) {
  return (
    <div className="fixed top-2.5 left-10 flex gap-2 bg-[#232329] p-2 rounded-md z-30">
      <IconButton
        activated={selectedTool == "pan"}
        icon={<Hand/>}
        onClick={() => {
          setSelectedTool("pan");
        }}
      />
      <IconButton
        activated={selectedTool == "selection"}
        icon={<MousePointer/>}
        onClick={() => {
          setSelectedTool("selection");
        }}
      />
      <IconButton
        activated={selectedTool == "pencil"}
        icon={<PencilIcon/>}
        onClick={() => {
          setSelectedTool("pencil");
        }}
      />
      <IconButton
        activated={selectedTool == "line"}
        icon={<LineIcon/>}
        onClick={() => {
          setSelectedTool("line");
        }}
      />
      <IconButton
        activated={selectedTool == "rect"}
        icon={<RectangleHorizontal />}
        onClick={() => {
          setSelectedTool("rect");
        }}
      />
      <IconButton
        activated={selectedTool == "circle"}
        icon={<Circle />}
        onClick={() => {
          setSelectedTool("circle");
        }}
      />
      <IconButton
        activated={selectedTool == "rhombus"}
        icon={<Diamond/>}
        onClick={() => {
          setSelectedTool("rhombus");
        }}
      />
      <IconButton
        activated={selectedTool == "arrow"}
        icon={<ArrowUpRight/>}
        onClick={() => {
          setSelectedTool("arrow");
        }}
      />
      <IconButton
        activated={selectedTool == "text"}
        icon={<LetterTextIcon/>}
        onClick={() => {
          setSelectedTool("text");
        }}
      />
    </div>
  );
}
