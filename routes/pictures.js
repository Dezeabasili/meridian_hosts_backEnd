const express = require('express')
const router = express.Router()
const picturesController = require('./../controllers/picturesController')


router.get('/cities/:cityname', picturesController.getCities)
// router.get('/hotels/', picturesController.getHotels)
// router.get('/rooms', picturesController.getRooms)
// router.get('/types', picturesController.getHotelTypes)


module.exports = router