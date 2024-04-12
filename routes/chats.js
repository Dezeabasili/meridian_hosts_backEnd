const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')
const verifyAccessToken = require('./../middlewares/verifyJWT')
const verifyRoles = require('./../middlewares/verifyRoles')

router.get('/', verifyAccessToken, chatController.getAllChats)

router.post('/', verifyAccessToken, chatController.createOneOnOneChat)

router.post('/groupchat', verifyAccessToken, chatController.createGroupChat)

router.patch('/addmember', verifyAccessToken, chatController.addMemberToGroup)

router.patch('/removemember', verifyAccessToken, chatController.removeMemberFromGroup)

router.patch('/renamegroup', verifyAccessToken, chatController.renameGroupChat)

router.patch('/leavegroup', verifyAccessToken, chatController.leaveGroupChat)

router.patch('/changeadmin', verifyAccessToken, chatController.changeGroupAdmin)

router.get('/:chat_Id', verifyAccessToken, chatController.getChat)

module.exports = router