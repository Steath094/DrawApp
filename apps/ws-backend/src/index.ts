import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import {JWT_SECRET} from '@repo/backend-common/config'
import { RoomManager } from './RoomManager';
import { shapeService } from './ShapeService';
const wss = new WebSocketServer({ port: 8080 });

enum WsMessageType {
        JOIN = "JOIN_ROOM",
        LEAVE = "LEAVE_ROOM",
        DRAW = "DRAW_SHAPE",
        ERASE = "ERASE",
        UPDATE = "UPDATE",
        SHAPE_DRAGGING = "SHAPE_DRAG_UPDATE",
        SHAPE_DRAWING = "SHAPE_DRAW_UPDATE"
}
function checkUser(token:string): string | null {
    try {
      const decoded = jwt.verify(token,JWT_SECRET as string
      );
      if (typeof decoded ==='string') {
        return null
      }
      if (!decoded || !decoded.id) {
          return null
      }
      // console.log(decoded);
      
      return decoded.id;
    } catch (error) {
      return null;
    }
}
const roomManager = new RoomManager();
wss.on('connection', function connection(ws,req) {
  const url = req.url;
  if (!url) {
    return
  }
  const queryParams = new URLSearchParams(url.split('?')[1])
  
  const token = queryParams.get('token') || "";
  const userId = checkUser(token)
  if (userId===null) {
    ws.close();
    return
  }
  
  (ws as any).userId = userId; 
  ws.on('message',async function message(data) {
      try {
        const parsedData = JSON.parse(data as unknown as string);
        const {type, roomId, id, message} = parsedData;
        let broadcastMessage: string | null = null;
        switch(type) {
          case WsMessageType.JOIN : {
            roomManager.joinRoom(ws,roomId);
            break;
          }
          case WsMessageType.LEAVE: {
            roomManager.leaveRoom(ws);
            break;
          }
          case WsMessageType.DRAW: {
            await shapeService.createShape(id,roomId,message,(ws as any).userId)
            broadcastMessage = data.toString();
            break;
          }
          case WsMessageType.ERASE: {
            await shapeService.deleteShape(id);
            broadcastMessage = data.toString();
            break;
          }
          case WsMessageType.UPDATE: {
            await shapeService.updateShape(id,message)
            broadcastMessage=data.toString();
            break;
          }
          case WsMessageType.SHAPE_DRAWING:
          case WsMessageType.SHAPE_DRAGGING: {
            broadcastMessage = data.toString();
            break;
          }
        }
        if (broadcastMessage) {
          roomManager.broadcast(ws, broadcastMessage);
        }
      } catch (error) {
        console.error("Failed to process message:", error);
      }


  });
  ws.on('close', () => {
    roomManager.leaveRoom(ws);
  });
});
console.log("WebSocket server started on port 8080");