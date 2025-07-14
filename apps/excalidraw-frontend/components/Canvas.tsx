import React, { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import IconButton from "./IconButton";
import { ArrowUpRight, Circle, Diamond, LetterText, LetterTextIcon, PencilIcon, RectangleHorizontal } from "lucide-react";
import { Game } from "@/draw/Game";
import LineIcon from "./Icons/LineIcon";

export type Tool = "circle" | "rect" | "pencil" | "rhombus" | "arrow" | "line" | "text";
export default function Canvas({
  roomId,
  socket,
}: {
  roomId: number;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game,setGame] = useState<Game>()
  const [selectedTool, setSelectedTool] = useState<Tool>("rect");
  useEffect(() => {
    //@ts-ignore
    game?.setTool(selectedTool);
    console.log(selectedTool);
    
  }, [selectedTool,game]);
  useEffect(() => {
    if (canvasRef.current) {
      const g = new Game(canvasRef.current,roomId,socket)
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
    >
      <div className="textEditorContainer"></div>
      <canvas
        ref={canvasRef}
        className="border-2 border-black"
        height={window.innerHeight}
        width={window.innerWidth}
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
    <div className="fixed top-2.5 left-10 flex gap-2 bg-[#232329] p-2 rounded-md">
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
