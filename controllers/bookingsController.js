const Room = require('./../models/rooms')
const Booking = require('./../models/bookings')
const User = require('./../models/users')
const createError = require('../utils/error')

const getAllBookings = async (req, res, next) => {
    try {
        let queryObj = {}
        if (req.query.hotel_id) {
            queryObj.hotel = req.query.hotel_id
        }
        const bookings = await Booking.find(queryObj)
        if (!bookings) return next(createError('fail', 404, 'this user has no bookings'))

        res.status(200).json({
            number: bookings.length,
            data: bookings
        })

    } catch(err) {
        next(err)
    }
}

const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({user: req.userInfo.id})
        // if (!bookings) return next(createError('fail', 404, 'this user has no bookings'))
        // console.log('bookings: ', bookings)

        res.status(200).json({
            number: bookings.length,
            data: bookings
        })

    } catch(err) {
        next(err)
    }
}


const findCustomerBooking = async (req, res, next) => {
    try {
        let bookings = [];
        if (req.body.booking_id) {
           const userbooking = await Booking.findById(req.body.booking_id)
           if (!userbooking) return next(createError('fail', 404, 'the booking does not exist'))
           bookings.push(userbooking)

        } else if (req.body.email) {
            const user = await User.findOne({email: req.body.email})
            if (!user) return next(createError('fail', 404, 'this user email does not exist'))
            // find all the bookings for this user
            bookings = await Booking.find({user: user._id})
            if (!bookings) return next(createError('fail', 404, 'the booking does not exist'))
        }     

        res.status(200).json({data: bookings})

    } catch (err) {

        next(err)

    }
}

const deleteBooking = async (req, res, next) => {
    try {

        const booking = await Booking.findById(req.params.booking_id)
        if (!booking) return next(createError('fail', 404, 'this booking does not exist'))
        // console.log('booking: ', booking)
        booking.bookingDetails.forEach(async roomInfo => {

            const roomStyle = await Room.findOne({ "roomNumbers._id": roomInfo.room_id })
            // console.log('roomStyle: ', roomStyle)
            const room = (roomStyle.roomNumbers)?.find(({ _id }) => _id == roomInfo.room_id)
            // console.log('room: ', room)
            const convertedDates = room.unavailableDates?.map(eachDate => eachDate.getTime())

            const indexOfCheckinDate = convertedDates?.indexOf((roomInfo.checkin_date).getTime())

            if (indexOfCheckinDate >= 0) {
                room.unavailableDates.splice(indexOfCheckinDate, roomInfo.number_of_nights)
            }


            roomStyle.roomNumbers = roomStyle.roomNumbers?.map((roomNumber) => {
                if (roomNumber._id == roomInfo.room_id) {
                    return {
                        ...roomNumber,
                        unavailableDates: [...room.unavailableDates]
                    }
                } else return roomNumber
            })


            await Room.updateOne(
                { "roomNumbers._id": roomInfo.room_id },
                {
                  $set: {
                    "roomNumbers.$.unavailableDates": room.unavailableDates,
                  },
                }
              );


            // console.log(roomStyle)

            // save the updated room
            // await roomStyle.save()

            await Booking.findByIdAndUpdate(req.params.booking_id, {$set: {deleted: true}})


        })

        res.status(204).json('booking has been deleted')

    } catch (err) {

        next(err)

    }



}

module.exports = { 
    deleteBooking,
    getAllBookings,
    getMyBookings,
    findCustomerBooking
}