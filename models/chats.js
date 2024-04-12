const mongoose = require('mongoose')
const { Schema } = mongoose

const ChatSchema = new Schema({
    members: [{
        type: mongoose.ObjectId,
        ref: 'User',
        required: [true, 'A chat must have at least one member']
    }],
    chatName: {
        type: String,
        ref: 'Hotel',
        required: [true, 'A chat must have a name']
    },
    groupChat: {
        type: Boolean,
        default: false
    },
    groupAdmin: {
        type: mongoose.ObjectId,
        ref: 'User',
    }, 
    lastMessage: {
        type: mongoose.ObjectId,
        ref: 'Message',
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

module.exports = mongoose.model("Chat", ChatSchema)