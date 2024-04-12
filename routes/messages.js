const express = require('express')
const router = express.Router()
const messageController = require('../controllers/messageController')
const verifyAccessToken = require('./../middlewares/verifyJWT')
const verifyRoles = require('./../middlewares/verifyRoles')

router.get('/:chat_id', verifyAccessToken, messageController.getAllMessages)

router.post('/', verifyAccessToken, messageController.createMessage)

// router.get('/:message_Id', verifyAccessToken, messageController.getMessage)

module.exports = router