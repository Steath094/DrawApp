import IconButton from "./IconButton"
import LeftTurnArrow from "./Icons/LeftTurnArrow"
import RightTurnArrow from "./Icons/RightTurnArrow"

export function StackBar({callUndo,callRedo}:{callUndo:()=> void,callRedo:()=> void}){
    return(
        <div className="fixed bottom-4 left-70 -translate-x-1/2  p-2 flex gap-3 bg-[#2b2b32] px-3 py-2 rounded-2xl shadow-lg z-30 [&>*]:cursor-pointer [&>*]:p-2 [&>*]:rounded-xl [&>*:hover]:bg-[#3a3a42] transition">
            <IconButton activated={false} icon={<LeftTurnArrow/>} onClick={()=>{callUndo()}} />
            <IconButton activated={false} icon={<RightTurnArrow/>} onClick={()=>{callRedo()}} />
        </div>
    )
}