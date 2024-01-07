const Booking = require('../models/bookings')
const Review = require('../models/reviews')
const createError = require('../utils/error')
const Hotel = require('./../models/hotels')
const Room = require('./../models/rooms')
const City = require('./../models/cities')
const HotelType = require('./../models/hotelTypes')

// create hotel
const createHotel = async (req, res, next) => {
    try {
        console.log('Inside create Hotel')
        console.log('req.body :', req.body)
        const hotel = await Hotel.create(req.body)
        res.status(201).json({
            data: hotel
        })

    } catch (err) {
        next(err)
    }
}

// get all hotels
const getAllHotels = async (req, res, next) => {
    let sort
    let limit
    if (req.query.sort) {
        sort = req.query.sort
    }
    if (req.query.limit) {
        limit = req.query.limit
    }
    // const minPrice = req.query.min * 1 || 0
    // const maxPrice = req.query.max * 1 || 1000
    // const { min, max, ...others } = req.query

    // let queryParams = {}

    // queryParams = {
    //     ...others,
    //     cheapestPrice: {
    //         $gte: minPrice,
    //         $lte: maxPrice
    //     }
    // }
    // console.log(queryParams)

    let name = {}
    let type = {}
    let city = {}
    let queryParams = {}
    let expressionsArray = []

    if (req.query.city) {
        city.city = req.query.city.toLowerCase()
        expressionsArray.push(city)
    }
    if (req.body.name) {
        name.name = req.body.name.toLowerCase()
        expressionsArray.push(name)
    } 
    if (req.body.type) {
        type.type = req.body.type.toLowerCase()
        expressionsArray.push(type)
    } 
    if (req.body.city) {
        city.city = req.body.city.toLowerCase()
        expressionsArray.push(city)
    }

    if (expressionsArray.length > 0) {
        queryParams = { $or: expressionsArray}
    }


    try {
        // The explain method in the query below makes this query return detailed execution stats instead of the 
        // actual query result. This method is useful for determining what index your queries use.
        // const hotels = await Hotel.find(queryParams).explain()
        const hotels = await Hotel.find(queryParams).sort(sort).limit(limit)
        res.status(200).json({
            number: hotels.length,
            data: hotels
        })

    } catch (err) {
        next(err)
    }
}
// get all hotels
const getAllHotels2 = async (req, res, next) => {
    const minPrice = req.query.min * 1 || 0
    const maxPrice = req.query.max * 1 || 1000
    const { min, max, ...others } = req.query

    let queryParams = {}

    queryParams = {
        ...others,
        cheapestPrice: {
            $gte: minPrice,
            $lte: maxPrice
        }
    }
    // console.log(queryParams)

    // let name = {}
    // let type = {}
    // let city = {}
    // let queryParams = {}
    // let expressionsArray = []

    // if (req.body.name) {
    //     name.name = req.body.name.toLowerCase()
    //     expressionsArray.push(name)
    // } 
    // if (req.body.type) {
    //     type.type = req.body.type.toLowerCase()
    //     expressionsArray.push(type)
    // } 
    // if (req.body.city) {
    //     city.city = req.body.city.toLowerCase()
    //     expressionsArray.push(city)
    // }

    // if (expressionsArray.length > 0) {
    //     queryParams = { $or: expressionsArray}
    // }


    try {
        // The explain method in the query below makes this query return detailed execution stats instead of the 
        // actual query result. This method is useful for determining what index your queries use.
        // const hotels = await Hotel.find(queryParams).explain()
        const hotels = await Hotel.find(queryParams)
        res.status(200).json({
            number: hotels.length,
            data: hotels
        })

    } catch (err) {
        next(err)
    }
}

// get a specific hotel
const getHotel = async (req, res, next) => {
    try {
        //You can populate the staff property as shown below. This will display all the fields
        // const hotel = await Hotel.findById(req.params.hotel_id).populate('staff')

        // You can also populate the staff property with selected fields as shown below
        // const hotel = await Hotel.findById(req.params.hotel_id).populate({
        //     path: 'staff',
        //     select: '-__v -passwordResetTime'
        // })

        // There is a pre find hook in the hotels file, in the models directory, that populates the staff property 
        // with selected fields
        const hotel = await Hotel.findById(req.params.hotel_id)
        if (!hotel) return next(createError('fail', 404, 'this hotel does not exist'))
        res.status(200).json({
            data: hotel
        })

    } catch (err) {
        next(err)
    }
}

// update a specific hotel
const updateHotel = async (req, res, next) => {

    try {
        const hotel = await Hotel.findById(req.params.hotel_id)
        if (!hotel) return next(createError('fail', 404, 'this hotel does not exist'))

        if (req.body.name) {           
            hotel.name = req.body.name.trim()
        } 
        if (req.body.city) hotel.city = req.body.city.trim()
        if (req.body.type) hotel.type = req.body.type.trim()
        if (req.body.address) hotel.hotelLocation.address = req.body.address.trim()
        if (req.body.description) hotel.description = req.body.description.trim()
        if (req.body.manager) hotel.manager = req.body.manager.trim()
        if (req.body.addStaff) {
            if (hotel.staff.indexOf(req.body.addStaff.trim()) === -1) {
                hotel.staff.push(req.body.addStaff.trim())
            }
        }
        if (req.body.removeStaff) {
            hotel.staff = hotel.staff.filter(staff => staff._id != req.body.removeStaff.trim())
        }

        const updatedHotel = await hotel.save()



        // const hotel2 = await Hotel.findByIdAndUpdate(req.params.hotel_id, { $set: req.body }, { new: true, runValidators: true })
        // if (!hotel) return next(createError('fail', 404, 'this hotel does not exist'))
        res.status(200).json({
            data: updatedHotel
        })

    } catch (err) {
        next(err)
    }
}

// delete a specific hotel
const deleteHotel = async (req, res, next) => {
    try {
        const hotel = await Hotel.findByIdAndDelete(req.params.hotel_id)
        if (!hotel) return next('fail', createError(404, 'this hotel does not exist'))

        // delete the rooms that belong to this hotel
        const rooms = await Room.deleteMany({hotel: hotel._id})
        // delete the bookings for this hotel
        const bookings = await Booking.deleteMany({hotel: hotel._id})
        // delete the reviews for this hotel
        const reviews = await Review.deleteMany({hotel: hotel._id})
        // console.log('rooms deleted: ', result)
        res.status(204).json("Hotel has been deleted")

    } catch (err) {
        next(err)
    }
}

// get hotels by city name
const countByCity = async (req, res, next) => {
   

    const citiesString = req.query.cities
    const citiesArray = citiesString.split(',')
    try {
    
        const promiseList = citiesArray.map((city) => {
            return Hotel.countDocuments({ city })
        })
        const countList = await Promise.all(promiseList)

        res.status(201).json({
            data: countList
        })

    } catch (err) {
        next(err)
    }
}

// get hotels by city name
const countByCityNew = async (req, res, next) => {
   
    try {
        const countHotelsByCities = await Hotel.aggregate([
            {
                $group: {
                    _id: '$city',
                    numberOfHotels: { $sum: 1 }
                }
            }
        ])

        res.status(201).json({
            data: countHotelsByCities
        })

    } catch (err) {
        next(err)
    }
}

// get hotels by type
const countByType = async (req, res, next) => {

    try {
        const hotelCount = await Hotel.countDocuments({ type: 'Hotel' })
        const apartmentCount = await Hotel.countDocuments({ type: 'Apartment' })
        const resortCount = await Hotel.countDocuments({ type: 'Resort' })
        const villaCount = await Hotel.countDocuments({ type: 'Villa' })
        const cabinCount = await Hotel.countDocuments({ type: 'Cabin' })

        res.status(201).json([
            { type: 'Hotel', count: hotelCount },
            { type: 'Apartment', count: apartmentCount },
            { type: 'Resort', count: resortCount },
            { type: 'Villa', count: villaCount },
            { type: 'Cabin', count: cabinCount },
        ])

    } catch (err) {
        next(err)
    }
}
// get hotels by type
const countByTypeNew = async (req, res, next) => {
        
    try {
        const countHotelsByType = await Hotel.aggregate([
            {
                $group: {
                    _id: '$type',
                    numberOfHotels: { $sum: 1 }
                }
            }
        ])

        res.status(201).json({
            data: countHotelsByType
        })
} catch (err) {
    next(err)
}
}

// get rooms in a specific hotel
const getHotelRooms = async (req, res, next) => {
    try {
        const hotel = await Hotel.findById(req.params.hotel_id)
        if (!hotel) return next('fail', createError(400, 'this hotel does not exist'))
        // get the array with room ids in this particular hotel
        const roomIdsArray = hotel.room_ids

        const promiseList = roomIdsArray.map((roomId) => {
            return Room.findById(roomId).populate({
                path: 'hotel',
                select: 'name city'
            })
        })
        const RoomTypeArray = await Promise.all(promiseList)


        res.status(200).json({
            data: RoomTypeArray
        })

    } catch (err) {
        next(err)
    }
}

// hotel statistics
const getHotelStats = async (req, res, next) => {
    try {
        const stats = await Hotel.aggregate([
            {
                $match: { rating: { $gte: 1 } }
            },
            {
                $group: {
                    _id: '$type',
                    numHotels: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                    avgPrice: { $avg: '$cheapestPrice' },
                    minPrice: { $min: '$cheapestPrice' },
                    maxPrice: { $max: '$cheapestPrice' },
                }
            },
            {
                $sort: { avgPrice: 1 }
            },
            {
                $match: { _id: { $ne: 'Apartment' } }
            }
        ])

        res.status(200).json({
            data: stats
        })
    } catch (err) {
        next(err)
    }
}

const getHotelsWithin = async (req, res, next) => {
    try {
        const { distance, latlng, unit } = req.params

        const [lat, lng] = latlng.split(',')

        // radius of the earth is 3962.2 miles or 6378.1 km

        const radius = unit === 'mi' ? distance / 3962.2 : distance / 6378.1

        if (!lat || !lng) return next(createError('fail', 400, 'Please provide the latitude and the longitude'))

        const hotels = await Hotel.find({
            hotelLocation: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radius]
                }
            }
        })

        res.status(200).json({
            status: 'success',
            number: hotels.length,
            data: hotels
        })
    } catch (err) {
        next(err)
    }

}

const getDistances = async (req, res, next) => {
    try {
        const { latlng, unit } = req.params

        const [lat, lng] = latlng.split(',')

        if (!lat || !lng) return next(createError('fail', 400, 'Please provide the latitude and the longitude'))
        const multiplier = unit === 'mi' ? 0.000621371 : 0.001

        const hotels = await Hotel.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [lng * 1, lat * 1]
                    },
                    key: 'hotelLocation',
                    distanceField: 'distanceAway',
                    distanceMultiplier: multiplier
                }
            },
            {
                $project: {
                    distanceAway: 1,
                    name: 1
                }
            }

        ])

        res.status(200).json({
            status: 'success',
            number: hotels.length,
            data: hotels
        })
    } catch (err) {
        next(err)
    }

}

// create hotel city
const createHotelCity = async (req, res, next) => {
    try {
        const hotelCity = await City.create(req.body)
        res.status(201).json({
            data: hotelCity
        })

    } catch (err) {
        next(err)
    }
}

// create hotel type
const createHotelType = async (req, res, next) => {
    try {
        const hotelType = await HotelType.create(req.body)
        res.status(201).json({
            data: hotelType
        })

    } catch (err) {
        next(err)
    }
}

// get all hotel cities references
const getAllHotelCityRefs = async (req, res, next) => {
    try {
        const hotelCity = await City.find()
        res.status(200).json({
            data: hotelCity
        })

    } catch (err) {
        next(err)
    }
}

// get all hotel types references
const getAllHotelTypeRefs = async (req, res, next) => {
    try {
        const hotelType = await HotelType.find()
        res.status(200).json({
            data: hotelType
        })

    } catch (err) {
        next(err)
    }
}


module.exports = {
    createHotel,
    getAllHotels,
    getHotel,
    updateHotel,
    deleteHotel,
    countByCity,
    countByCityNew,
    countByType,
    countByTypeNew,
    getHotelRooms,
    getHotelStats,
    getHotelsWithin,
    getDistances,
    createHotelCity,
    createHotelType,
    getAllHotelCityRefs,
    getAllHotelTypeRefs
}