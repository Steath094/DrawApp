import express from 'express'
import { CreateRoomSchema, CreateUserSchema, SigninSchema } from "@repo/common/types"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { authMiddleware } from './middleware';
import {prismaClient} from "@repo/db/client";
import { JWT_SECRET } from '@repo/backend-common/config';
const app = express();
const PORT = process.env.PORT || 8000
app.use(express.json());

app.post("/api/v1/signup",async (req,res)=>{
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log(parsedData.error);
        
        res.status(401).send("Invalid Input Format")
        return
    }
    const hashedPassword = await bcrypt.hash(parsedData.data.password,10);
    //db call
    try {
        const user = await prismaClient.user.create({
            data:{
                email: parsedData.data.email,
                password: hashedPassword,
                name: parsedData.data.name
            }
        })
        res.status(200).json({
        userId: user.id,
        message: "User Successfully Created"
    })
    } catch (error) {
        res.status(411).json({
            message: "User already exists with this username"
        })
    }
})
app.post("/api/v1/signin",async (req,res)=>{
   const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(401).send("Invalid Input Format")
        return
    }

    //db call
    const user= await prismaClient.user.findFirst({
        where:{
            email: parsedData.data.email
        }
    })
    if (!user) {
         res.status(403).send("No User With such email Exists")
        return
    }
    //generate token
    const isValid = await bcrypt.compare(parsedData.data.password,user?.password as string)
    if (!isValid) {
        res.status(404).send("Wrong password")
        return
    }
    const token = jwt.sign({id:user.id},JWT_SECRET as string)
    res.status(200).json({
        token: token,
        message: "User Loggedin Successfulyy"
    })
})
app.post("/api/v1/room",authMiddleware,async (req,res)=>{
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(401).send("Invalid Input Format")
        return
    }
    const userId = req.userId;
    if (!userId) {
        res.status(404).json("unauthorizedRequest")
        return
    }
    //db call
    const room = await prismaClient.room.create({
        data:{
            slug: parsedData.data.name,
            adminId: userId as string
        }
    })
    res.status(200).json({
        roomId: room.id,
        message: "Room Successfully Created"
    })
    return
})
app.get('/api/v1/chat/:roomId',async (req,res)=>{
    const roomId = Number(req.params.roomId) 
    try {
        const messages = await prismaClient.chat.findMany({
            where:{
                roomId
            },
            take: 50
        })
        res.status(200).json(messages)
    } catch (error) {
        console.log(error);
        res.status(404).json({messages: []})
    }
})
app.get('/api/v1/room/:slug',async (req,res)=>{
    const slug = req.params.slug;
    try {
        const room = await prismaClient.room.findFirst({
            where:{
                slug
            }
        })
        res.status(200).json(room)
    } catch (error) {
        console.log(error);
        res.status(404).json({room: "Room Not Found"})
    }
})
app.listen(PORT,()=>{
    console.log("HTTP Backend Is running on Port:",PORT);
})