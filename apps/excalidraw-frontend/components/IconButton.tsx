import { ReactNode } from "react";

export default function IconButton({icon,onClick,activated}:{
    icon: ReactNode,
    onClick: ()=> void,
    activated: boolean
}){
    return <div className={`pointer rounded-full border p-2 bg-black hover:bg-gray-600  ${activated? 'text-red-600':'text-white'} `} onClick={onClick}>
        {icon}
    </div>
}