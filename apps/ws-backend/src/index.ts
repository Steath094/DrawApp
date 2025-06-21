import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import {JWT_SECRET} from '@repo/backend-common/config'
const wss = new WebSocketServer({ port: 8080 });

function checkUser(token:string): string | null {
    const decoded = jwt.verify(token,JWT_SECRET as string);
    if (typeof decoded ==='string') {
      return null
    }
    if (!decoded || !decoded.id) {
        return null
    }

    return decoded.id;
}
wss.on('connection', function connection(ws,req) {
  const url = req.url;
  if (!url) {
    return
  }
  const queryParams = new URLSearchParams(url.split('?')[1])
  const token = queryParams.get('token') || "";
  const userAuthenticated = checkUser(token)
  if (!userAuthenticated) {
    ws.close();
    return
  }
  ws.on('message', function message(data) {
    if (typeof data !=='string') {
      return
    }
      const parsedData = JSON.parse(data);

      if (parsedData.type == "join_room") {
        //store in local state
        
      }
      if (parsedData.type == "leave_room") {
        //update in local state

      }

      if (parsedData.type == "chat") {
        //update in local state
          const room = parsedData.roomId;
          const message = parsedData.message;
      }
      ws.send('pong');
  });

});