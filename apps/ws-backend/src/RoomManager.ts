import WebSocket from "ws";

export class RoomManager{
    private rooms: Map<number,Set<WebSocket>>;
    constructor(){
        this.rooms = new Map();
    }
    joinRoom(socket: WebSocket,roomId: number){
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId,new Set());
        }
        this.rooms.get(roomId)?.add(socket);
        (socket as any).roomId = roomId;
    }
    leaveRoom(socket:WebSocket){
        const roomId = (socket as any).roomId
        if (roomId && this.rooms.has(roomId)) {
            this.rooms.get(roomId)?.delete(socket);
            if (this.rooms.get(roomId)?.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }
    broadcast(senderSocket: WebSocket, message: string) {
        const roomId = (senderSocket as any).roomId;
        if (roomId && this.rooms.has(roomId)) {
            this.rooms.get(roomId)?.forEach(client => {
                // Only send to other clients, not the one who sent the message.
                if (client !== senderSocket && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }
}