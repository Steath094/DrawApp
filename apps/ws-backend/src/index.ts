import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import {prismaClient} from "@repo/db/client";
import {JWT_SECRET} from '@repo/backend-common/config'
const wss = new WebSocketServer({ port: 8080 });

enum WsMessageType {
        JOIN = "JOIN_ROOM",
        LEAVE = "LEAVE_ROOM",
        DRAW = "DRAW_SHAPE",
        ERASE = "ERASE",
        UPDATE = "UPDATE"
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
const users = new Map<string,Set<number>>();
const userSockets = new Map<string, Set<WebSocket>>();
const rooms = new Map<number, Set<string>>();
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
  users.set(userId,new Set<number>)
  if (!userSockets.has(userId)) {
    userSockets.set(userId,new Set<WebSocket>)
  }
  userSockets.get(userId)?.add(ws);

  ws.on('message',async function message(data) {
    console.log("users: ",users);
    console.log("rooms: ", rooms);
    
      const parsedData = JSON.parse(data as unknown as string);
      const roomId = parsedData.roomId;
      switch(parsedData.type) {
        case WsMessageType.JOIN : {
          const user = users.get(userId);
          
          if (!rooms.has(roomId)) {
            
            rooms.set(roomId,new Set<string>);
          }
          rooms.get(roomId)?.add(userId);
          user?.add(roomId);
          break;
        }
        case WsMessageType.LEAVE: {
          const user = users.get(userId);
          if (!user) {
            return
          }
          user.delete(roomId);
          rooms.get(roomId)?.delete(userId);
          if (rooms.get(roomId)?.size==0) {
            rooms.delete(roomId)
          }
          break;
        }
        case WsMessageType.DRAW: {
          console.log("working");
                    
          const roomId = parsedData.roomId;
          const message = parsedData.message;
          const shapeId = parsedData.id;
          const res = await prismaClient.shape.create({
            data:{
              id :shapeId,
              roomId,
              message,
              userId
            }
          })
          console.log(res);
          
          rooms.get(roomId)?.forEach(id=>{
            userSockets.get(id)?.forEach(ws => {
              ws.send(JSON.stringify({
                type: WsMessageType.DRAW,
                id :shapeId,
                message: message,
                roomId
              }))
            });
          })
          break;
        }
        case WsMessageType.ERASE: {
          const shapeId = parsedData.id;
          const roomId = parsedData.roomId;
          await prismaClient.shape.delete({
            where: {
              id: shapeId
            }
          })
          rooms.get(roomId)?.forEach(id=>{
            userSockets.get(id)?.forEach(ws => {
              ws.send(JSON.stringify({
                type: WsMessageType.ERASE,
                id :shapeId,
                roomId
              }))
            });
          })
          break;
        }
        case WsMessageType.UPDATE: {
          const shapeId = parsedData.id;
          const roomId = parsedData.roomId;
          const message = parsedData.message;
          await prismaClient.shape.update({
            where: {
              id: shapeId
            },
            data: {
              message: message
            }
          })
          rooms.get(roomId)?.forEach(id=>{
            userSockets.get(id)?.forEach(ws => {
              ws.send(JSON.stringify({
                type: WsMessageType.UPDATE,
                id :shapeId,
                message,
                roomId
              }))
            });
          })
          break;
        }
      }
  });
  ws.on('close', () => {
    userSockets.get(userId)?.delete(ws);
    if (userSockets.get(userId)?.size==0) {
      userSockets.delete(userId);
    }
});
});