import { Minus, Plus } from "lucide-react";
import IconButton from "./IconButton";
import { useState } from "react";

export function ZoomBar({value,setZoom}:{value:number,setZoom: (positive:boolean)=> void}){
    
    return(
        <div className="fixed bottom-4 left-30 -translate-x-1/2  p-2 flex gap-3 bg-[#2b2b32] px-3 py-2 rounded-2xl shadow-lg z-30 [&>*]:cursor-pointer [&>*]:p-2 [&>*]:rounded-xl [&>*:hover]:bg-[#3a3a42] transition">
            <IconButton activated={false} icon={<Minus/>} onClick={()=>{setZoom(false)}} />
            <div className="text-white">{value}%</div>
            <IconButton activated={false} icon={<Plus/>} onClick={()=>{setZoom(true)}} />
        </div>
    )
}