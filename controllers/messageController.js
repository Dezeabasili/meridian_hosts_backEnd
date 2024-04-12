const Chat = require("../models/chats");
const Message = require("../models/messages");
const User = require("../models/users");
const createError = require("../utils/error");

// create a message
const createMessage = async (req, res, next) => {
  try {
    // check if user sent the messageContent and the chatInfo
    const { messageContent, chatInfo } = req.body;
    if (!messageContent || !chatInfo)
      return next(
        createError(
          "fail",
          400,
          "Provide both the chatInfo and the messageContent"
        )
      );

    // create the new message
    const newMessage = await Message.create({
      messageContent,
      chatInfo,
      sentBy: req.userInfo.id,
    });

    // update the last message in the chat
    await Chat.findByIdAndUpdate(chatInfo, { lastMessage: newMessage._id });

    // populate all the necessary fields
    let populatedMessage = await Message.findById(newMessage._id)
      .populate({ path: "chatInfo" })
      .populate({ path: "sentBy", select: "name photo" });

    populatedMessage = await User.populate(populatedMessage, {
      path: "chatInfo.members",
      select: "name photo",
    });

    populatedMessage = await User.populate(populatedMessage, {
      path: "chatInfo.groupAdmin",
      select: "name photo",
    });

    res.status(201).json(populatedMessage);
  } catch (err) {
    next(err);
  }
};


// continue tomorrow, 9th Apr 2024

// get all messages for a particular chat
const getAllMessages = async (req, res, next) => {
  try {
    // check if the chat id was sent
    const { chat_id } = req.params
    if (!chat_id) return next(
      createError(
        "fail",
        400,
        "Provide both the chat id"
      )
    );


    // get all the messages and populate relevant fields
    let chatMessages = await Message.find({chatInfo: chat_id})
    .populate({ path: "chatInfo" })
    .populate({ path: "sentBy", select: "name photo" })
    .sort("createdAt")

    chatMessages = await User.populate(chatMessages, {
      path: "chatInfo.members",
      select: "name photo",
    });

    chatMessages = await User.populate(chatMessages, {
      path: "chatInfo.groupAdmin",
      select: "name photo",
    });

    res.status(200).json(chatMessages)

  } catch (err) {
    next(err)
  }
};


module.exports = {
  createMessage,
  getAllMessages,
};
