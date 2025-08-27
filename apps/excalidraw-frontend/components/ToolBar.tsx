import IconButton from "./IconButton";
import { ArrowUpRight, Circle, Diamond, Hand, LetterTextIcon, LockKeyholeIcon, LockKeyholeOpenIcon, MousePointer, PencilIcon, RectangleHorizontal } from "lucide-react";
import { Tool } from "./Canvas";
import LineIcon from "./Icons/LineIcon";

export function ToolBar({
  selectedTool,
  setSelectedTool
}: {
  selectedTool: Tool;
  setSelectedTool: (s: Tool) => void;
}) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 flex gap-3 bg-[#2b2b32] px-3 py-2 rounded-2xl shadow-lg z-30 [&>*]:cursor-pointer [&>*]:p-2 [&>*]:rounded-xl [&>*:hover]:bg-[#3a3a42] transition">
      {/* <IconButton 
        activated={selectedTool == "lock"}
        icon={selectedTool=="lock"?<LockKeyholeIcon/>:<LockKeyholeOpenIcon/>}
        onClick={() => {
          setSelectedTool("lock");
        }}
      /> */}
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