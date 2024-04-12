const mongoose = require('mongoose')
const { Schema } = mongoose

const MessageSchema = new Schema({
    messageContent: {
        type: String,
        required: [true, 'A message cannot be empty']
    },
    chatInfo: {
        type: mongoose.ObjectId,
        ref: 'Chat',
        required: [true, 'A message must have a chatInfo']
    },
    sentBy: {
        type: mongoose.ObjectId,
        ref: 'User',
        required: [true, 'A message must have a sender']
    }
}, 
{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

module.exports = mongoose.model("Message", MessageSchema)