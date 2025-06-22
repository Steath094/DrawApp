import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config'
export const authMiddleware =async (req:Request,res:Response,next:NextFunction) =>{
    const token = req.headers["authorization"] ?? "";
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded) {
        // @ts-ignore: TODO: Fix this
        req.userId = decoded.id;
        next();
    } else {
        res.status(403).json({
            message: "Unauthorized"
        })
    }
}