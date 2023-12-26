const mongoose = require('mongoose')

const { Schema } = mongoose

const BookingSchema = new Schema({
    user: {
        type: mongoose.ObjectId,
        ref: 'User',
        required: [true, 'A booking must have a user']
    },
    hotel: {
        type: mongoose.ObjectId,
        ref: 'Hotel',
        required: [true, 'A booking must have a hotel']
    },
    bookingDetails: [
        {
            roomType_id: String,
            room_id: String,
            roomNumber: Number,
            checkin_date: Date,
            checkout_date: Date,
            price_per_night: Number,
            number_of_nights: Number,
            room_type: String
        }
    ],
    deleted: {
        type: Boolean,
        default: false,
        select: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// to populate the hotel and user properties with selected fields
BookingSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'hotel',
        select: 'name'
    }).populate({
        path: 'user',
        select: 'name'
    })
    next()
})



// Query middleware
BookingSchema.pre(/^find/, function (next) {
    this.find({ deleted: { $ne: true } })
    next()
})


module.exports = mongoose.model("Booking", BookingSchema)