import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config'
export const authMiddleware =async (req:Request,res:Response,next:NextFunction) =>{
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        res.status(403).json("Invalid Token")
        return
    }
    const decoded = jwt.verify(token,JWT_SECRET as string);
    if (decoded) {
        //@ts-ignore
        req.userId = decoded.id;
        next();
    }else{
        res.status(404).json("Unauthorized Request");
    }
}