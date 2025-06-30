import { initDraw } from "@/draw";
import React, { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";
import IconButton from "./IconButton";
import { Circle, PencilIcon, RectangleHorizontal } from "lucide-react";

type tools = "circle" | "rect" | "pencil";
export default function Canvas({
  roomId,
  socket,
}: {
  roomId: number;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState<tools>("rect");

  useEffect(() => {
    //@ts-ignore
    window.selectedTool = selectedTool;
  }, [selectedTool]);
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      initDraw(canvas, roomId, socket);
    }
  }, [canvasRef]);
  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
      }}
    >
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
  setSelectedTool,
}: {
  selectedTool: tools;
  setSelectedTool: (s: tools) => void;
}) {
  return (
    <div className="fixed top-2.5 left-10 flex gap-2 bg-[#232329] p-2 rounded-md">
      <IconButton
        activated={selectedTool == "pencil"}
        icon={<PencilIcon />}
        onClick={() => {
          setSelectedTool("pencil");
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
    </div>
  );
}
