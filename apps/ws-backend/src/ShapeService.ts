import { prismaClient } from "@repo/db/client";

export const shapeService = {
    async createShape(id: string,roomId: number,message: string,userId: string){
        return await prismaClient.shape.create({
            data: {
                id,
                roomId,
                message,
                userId
            }
        })
    },
    async updateShape(id: string,message: string){
        return await prismaClient.shape.update({
            where: {
                id
            },
            data:{
                message
            }
        })
    },
    async deleteShape(id: string){
        return await prismaClient.shape.delete({
            where:{
                id
            }
        })
    }
}