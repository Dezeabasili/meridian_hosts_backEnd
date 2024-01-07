const express = require('express')
const router = express.Router()
const hotelsController = require('./../controllers/hotelsController')
const verifyAccessToken = require('./../middlewares/verifyJWT')
const reviewsRouter = require('./reviews')

router.use('/:hotel_id/reviews', reviewsRouter)

router.route('/')
    .post(hotelsController.createHotel)
    .get(hotelsController.getAllHotels)


router.get('/hotelstats/stats', hotelsController.getHotelStats)

router.get('/hotelswithin/:distance/center/:latlng/unit/:unit', hotelsController.getHotelsWithin)

router.get('/hotelsdistances/center/:latlng/unit/:unit', hotelsController.getDistances)

router.get('/countbycity/cityname', hotelsController.countByCity)
router.get('/countbycity', hotelsController.countByCityNew)
router.get('/countbytype/all', hotelsController.countByType)
router.get('/countbytype', hotelsController.countByTypeNew)
router.get('/room/:hotel_id', hotelsController.getHotelRooms)
router.get('/allcityrefs', hotelsController.getAllHotelCityRefs)
router.get('/allhoteltyperefs', hotelsController.getAllHotelTypeRefs)
router.post('/createcity', hotelsController.createHotelCity)
router.post('/createhoteltype', hotelsController.createHotelType)

router.route('/:hotel_id')
    .get(hotelsController.getHotel)
    .patch(hotelsController.updateHotel)
    .delete(hotelsController.deleteHotel)


module.exports = router