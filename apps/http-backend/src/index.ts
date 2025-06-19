import express from 'express'
import z from 'zod'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
const app = express();
const PORT = process.env.PORT || 8000
app.use(express.json());

app.post("/api/v1/signup",async (req,res)=>{
    const requiredBody = z.object({
        userName: z.string().email().min(3),
        password: z.string().min(6).max(15)
    })
    const parsedData = requiredBody.safeParse(req.body);
    if (!parsedData.success) {
        res.status(401).send("Invalid Input Format")
        return
    }
    const hashedPassword = await bcrypt.hash(parsedData.data.password,10);
    //db call

    //generate token
    // const token = jwt.sign({id:user.id},process.env.JWT_SECRET as string)
    res.status(200).json({
        token: "",
        message: "User Successfully Created"
    })
})
app.post("/api/v1/signin",async (req,res)=>{
    const {userName,password} = req.body;

    //db call
    const user= {password: ""};
    //generate token
    const isValid = await bcrypt.compare(password,user?.password)
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