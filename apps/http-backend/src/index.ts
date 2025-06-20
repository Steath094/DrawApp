import express from 'express'
import { CreateRoomSchema, CreateUserSchema, SigninSchema } from "@repo/common/types"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { authMiddleware } from './middleware';
import prisma from "@repo/db/client";
const app = express();
const PORT = process.env.PORT || 8000
app.use(express.json());

app.post("/api/v1/signup",async (req,res)=>{
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(401).send("Invalid Input Format")
        return
    }
    const hashedPassword = await bcrypt.hash(parsedData.data.password,10);
    //db call
    const user = await prisma.user.create({
        data:{
            userNmae: parsedData.data.userName,
            password: parsedData.data.userName
        }
    })

    //generate token
    // const token = jwt.sign({id:user.id},process.env.JWT_SECRET as string)
    res.status(200).json({
        token: "",
        message: "User Successfully Created"
    })
})
app.post("/api/v1/signin",async (req,res)=>{
   const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(401).send("Invalid Input Format")
        return
    }

    //db call
    const user= {password: ""};
    //generate token
    const isValid = await bcrypt.compare(parsedData.data.password,user?.password)
    if (!isValid) {
        res.status(404).send("Wrong password")
        return
    }
    // const token = jwt.sign({id:user.id},process.env.JWT_SECRET as string)
    res.status(200).json({
        token: "",
        message: "User Loggedin Successfulyy"
    })
})
app.post("/api/v1/room/:roomId",authMiddleware,async (req,res)=>{
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(401).send("Invalid Input Format")
        return
    }
    //@ts-ignore
    const userId = req.userId;
    // const roomId = req.params()
    //db call

    res.status(200).json({
        roomId: "",
        message: "Room Successfully Created"
    })
})

app.listen(PORT,()=>{
    console.log("HTTP Backend Is running on Port:",PORT);
    
})