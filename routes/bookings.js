const express = require('express')
const router = express.Router()
const bookingsController = require('./../controllers/bookingsController')
const verifyAccessToken = require('./../middlewares/verifyJWT')


router.get('/', bookingsController.getAllBookings)

router.get('/mybookings',verifyAccessToken, bookingsController.getMyBookings)

router.post('/findbooking', bookingsController.findCustomerBooking)

// router.post('/', reviewsController.createReview)

// router.patch('/:review_id', reviewsController.updateReview)

router.delete('/:booking_id', bookingsController.deleteBooking)


module.exports = router