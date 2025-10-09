import mongoose from "mongoose";


const eventSchema = new mongoose.Schema
(
    {
        user:
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        eventType:{
            type:String,
            required:true
        },
        eventDate:{
            type:Date,
            required:true
        },
        eventTime:{
            type:String,
            required:true
        },
        numOFMembers:{
            type:String,
            required:true
        },
        numOfPeopleEating: {
            type: Number,
            required: true,
        },
        venue:{
            type:String,
            required:true
        },
        totalPrice:{
            type:String,
            required:true
        }


    },
    {
        timestamps:true
    }
)

export const Event =  mongoose.model("Event",eventSchema);