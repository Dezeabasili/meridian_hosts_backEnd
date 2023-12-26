const express = require('express')
const router = express.Router()
const roomsController = require('./../controllers/roomsController')
const verifyAccessToken = require('./../middlewares/verifyJWT')


router.post('/', roomsController.createRoom)

router.get('/', roomsController.getAllRooms)

router.route('/:room_id')
    .get(roomsController.getRoom)
    .patch(roomsController.updateRoom)
    .delete(roomsController.deleteRoom)

router.patch('/availability/:room_id', roomsController.updateRoomAvailability)

module.exports = router