import { useEffect, useState } from "react"

export const useWindowSize = () =>{
  const [windowSize,setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerWidth
  })
  useEffect(() => {
    const handleSize = () =>{
        setWindowSize({
            width: window.innerWidth,
            height: window.innerWidth
        });
    }
    window.addEventListener('resize',handleSize);
    return () => {
        window.removeEventListener('resize',handleSize);
    }
  }, [])
  return windowSize;
}
