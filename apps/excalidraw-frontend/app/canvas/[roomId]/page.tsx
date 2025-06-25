import { RoomCanvas } from '@/components/RoomCanvas';
export default async function page({params}:{ 
    params:{
        roomId: number
    }
}) {
    const roomId = Number((await params).roomId);
    console.log(typeof roomId);
    
  return (
    <RoomCanvas roomId={roomId}></RoomCanvas>
  )
}
