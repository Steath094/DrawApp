import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import {JWT_SECRET} from '@repo/backend-common/config'
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws,req) {
  const token = req.url?.split('/').slice(-1)[0];
  if (!token) {
        ws.close()
    }
    const decoded = jwt.verify(token as string,JWT_SECRET as string);

    if (decoded) {
        //db call to verify
        ws.close() // if not verified else store id
    }
  ws.on('message', function message(data) {
    
      ws.send('pong');
  });

});