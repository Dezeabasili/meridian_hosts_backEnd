const Chat = require("../models/chats");
const User = require("../models/users");
const Message = require("../models/messages");
const createError = require("../utils/error");

// create a chat if it does not exist or fetch it if it exists
const createOneOnOneChat = async (req, res, next) => {
  try {
    // check if the chat partner was sent
    const { chatPartner_Id } = req.body;
    if (!chatPartner_Id)
      return next(createError("fail", 400, "Chat partner not sent"));

    // check if chat partner is in the database
    const chatPartner = await User.findById(chatPartner_Id);
    if (!chatPartner)
      return next(
        createError("fail", 404, "Intended chat partner not in database")
      );

    // check that the chat partner is not you
    const notMe = chatPartner_Id != req.userInfo.id;
    if (!notMe)
      return next(createError("fail", 400, "You cannot be your chat partner"));

    // check that a single chat that have you and the chat partner does not exist
    // const chat = await Chat.findOne({members: {$and: [{$size: 2}, {$all: [chatPartnerId, req.userInfo.id]}]}})
    const chat = await Chat.findOne({
      groupChat: false,
      $and: [
        { members: { $size: 2 } },
        { members: { $all: [chatPartner_Id, req.userInfo.id] } },
      ],
    })
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "lastMessage" });

    // create new chat if it does not exist
    if (!chat) {
      const newChat = await Chat.create({
        members: [chatPartner_Id, req.userInfo.id],
        chatName: "chatPartner",
      });

      // populate members field
      const populatedNewChat = await User.populate(newChat, {
        path: "members",
        select: "name photo",
      });
      return res.status(201).json(populatedNewChat);
    }

    // populate chat and return same
    const populatedChat = await User.populate(chat, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });
    return res.status(200).json(populatedChat);
  } catch (err) {
    next(err);
  }
};

// create a group chat
const createGroupChat = async (req, res, next) => {
  try {
    // check if the chat name and the group members were sent
    const { groupMembers, groupName } = req.body;
    if (!groupMembers || !groupName)
      return next(
        createError("fail", 400, "Send group members and group name")
      );

    // check that 2 or more members are sent
    if (groupMembers.length < 2)
      return next(
        createError(
          "fail",
          400,
          "You need more than two people to form a group"
        )
      );

    // check if all the group members are in the database
    let usersNotInDatabase = [];
    groupMembers.forEach(async (member) => {
      let getMember = await User.findById(member);
      if (!getMember) usersNotInDatabase.push(member);
    });
    if (usersNotInDatabase.length)
      return next(
        createError(
          "fail",
          400,
          `The following users in the array are not in the database: ${usersNotInDatabase}`
        )
      );

    // add the person creating the group
    groupMembers.push(req.userInfo.id);

    // create the group chat
    const newGroupChat = await Chat.create({
      members: groupMembers,
      chatName: groupName,
      groupChat: true,
      groupAdmin: req.userInfo.id,
    });

    // populate the relevant fields
    const populatedGroupChat = await Chat.findById(newGroupChat._id)
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" });

    return res.status(201).json(populatedGroupChat);
  } catch (err) {
    next(err);
  }
};

// get all chats for the logged in user
const getAllChats = async (req, res, next) => {
  try {
    // find all chats that has the logged-in user
    // populate all relevant fields
    // sort the output in order of when it was last updated
    let chats = await Chat.find({ members: req.userInfo.id })
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" })
      .populate({ path: "lastMessage" })
      .sort("-updatedAt");

    // populate the sentBy field in the lastMessage
    chats = await User.populate(chats, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });

    return res.status(200).json(chats);
  } catch (err) {
    next(err);
  }
};

// get a particular chat
const getChat = async (req, res, next) => {
  try {
    // check if the chat id was sent
    const { chat_Id } = req.params;
    if (!chat_Id) return next(createError("fail", 400, "Chat id not sent"));

    // get the chat and populate all relevant fields
    let chat = await Chat.findById(chat_Id)
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" })
      .populate({ path: "lastMessage" });

    // populate the sentBy field in the lastMessage
    chat = await User.populate(chat, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });

    return res.status(200).json(chat);
  } catch (err) {
    next(err);
  }
};

// add a member to a group chat
const addMemberToGroup = async (req, res, next) => {
  try {
    // check if member id and group id were sent
    const { member_Id, chat_id } = req.body;
    if (!member_Id || !chat_id)
      return next(createError("fail", 400, "Provide member id and chat id"));

    console.log(1);
    // check if member is in the database
    const checkDatabase = await User.findById(member_Id);
    if (!checkDatabase)
      return next(createError("fail", 404, "The user is not in the database"));

    console.log(2);
    // check if the chat is a group chat
    const isGroupChat = await Chat.findOne({ _id: chat_id, groupChat: true });
    if (!isGroupChat)
      return next(
        createError(
          "fail",
          404,
          "The chat you want to update is not a group chat or does not exist"
        )
      );

    console.log(3);
    // check if the person making the change is the groupAdmin
    const isAdmin = await Chat.findOne({
      _id: chat_id,
      groupAdmin: req.userInfo.id,
    });
    if (!isAdmin)
      return next(
        createError("fail", 403, "You are not authorized to add a group member")
      );

    console.log(4);
    // check if the intended member is already in the group
    const already_A_Member = await Chat.findOne({
      _id: chat_id,
      members: req.userInfo.id,
      groupChat: true,
    });
    if (!already_A_Member)
      return next(
        createError("fail", 400, "The user is already a member of the group")
      );

    console.log(5);
    // add member
    let updatedGroup = await Chat.findByIdAndUpdate(
      chat_id,
      { $push: { members: member_Id } },
      { new: true }
    )
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" })
      .populate({ path: "lastMessage" });

    console.log(6);
    // populate the sentBy field in the lastMessage
    updatedGroup = await User.populate(updatedGroup, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });
    res.status(200).json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

// add a member to a group chat
const removeMemberFromGroup = async (req, res, next) => {
  try {
    // check if member id and group id were sent
    const { member_Id, chat_id } = req.body;
    if (!member_Id || !chat_id)
      return next(createError("fail", 400, "Provide member id and chat id"));

    console.log(2);
    // check if the chat is a group chat
    const isGroupChat = await Chat.findOne({ _id: chat_id, groupChat: true });
    if (!isGroupChat)
      return next(
        createError(
          "fail",
          404,
          "The chat you want to update is not a group chat or does not exist"
        )
      );

    console.log(3);
    // check if the person making the change is the groupAdmin
    const isAdmin = await Chat.findOne({
      _id: chat_id,
      groupAdmin: req.userInfo.id,
    });
    if (!isAdmin)
      return next(
        createError(
          "fail",
          403,
          "You are not authorized to remove a group member"
        )
      );

    console.log(5);
    // remove member
    let updatedGroup = await Chat.findByIdAndUpdate(
      chat_id,
      { $pull: { members: member_Id } },
      { new: true }
    )
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" })
      .populate({ path: "lastMessage" });

    console.log(6);
    // populate the sentBy field in the lastMessage
    updatedGroup = await User.populate(updatedGroup, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });

    // delete group if members are less than 3
    if (updatedGroup.members.length < 3) {
      await Chat.findByIdAndDelete(chat_id);
      return res.sendStatus(204);
    }
    res.status(200).json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

// rename a group chat
const renameGroupChat = async (req, res, next) => {
  try {
    // check if group new name and group chat id are provided
    const { groupName, chat_id } = req.body;
    if (!groupName || !chat_id)
      return next(createError("fail", 400, "Provide new name and chat id"));

    // check if the chat is a group chat
    const isGroupChat = await Chat.findOne({ _id: chat_id, groupChat: true });
    if (!isGroupChat)
      return next(
        createError(
          "fail",
          404,
          "The chat you want to update is not a group chat or does not exist"
        )
      );

    // check if the person making the change is the groupAdmin
    const isAdmin = await Chat.findOne({
      _id: chat_id,
      groupAdmin: req.userInfo.id,
    });
    if (!isAdmin)
      return next(
        createError("fail", 403, "You are not authorized to rename the group")
      );

    // rename group and populate relevant fields
    let updatedGroup = await Chat.findByIdAndUpdate(
      chat_id,
      { chatName: groupName },
      { new: true }
    )
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" })
      .populate({ path: "lastMessage" });

    // populate the sentBy field in the lastMessage
    updatedGroup = await User.populate(updatedGroup, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });

    res.status(200).json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

// leave group
const leaveGroupChat = async (req, res, next) => {
  try {
    // check if chat id is provided
    const { chat_id } = req.body;
    if (!chat_id) return next(createError("fail", 400, "Provide chat id"));

    // check if chat is a group chat
    const isGroupChat = await Chat.findOne({ _id: chat_id, groupChat: true });
    if (!isGroupChat)
      return next(
        createError(
          "fail",
          404,
          "The chat is not a group chat or does not exist"
        )
      );

    // check if the user is a member of the group
    const isGroupMember = await Chat.findOne({ _id: chat_id, groupChat: true, members: req.userInfo.id});
    if (!isGroupMember)
      return next(
        createError(
          "fail",
          404,
          "Not a member of the group"
        )
      );


    // check if the member is the group admin
    const isAdmin = await Chat.findOne({ _id: chat_id, groupChat: true, groupAdmin: req.userInfo.id});
    if (isAdmin)
      return next(
        createError(
          "fail",
          404,
          "You need to delegate the groupAdmin role to another member before you can leave group"
        )
      );

    // remove user from group and populate relevant fields
    let updatedGroup = await Chat.findByIdAndUpdate(
      chat_id,
      { $pull: { members: req.userInfo.id } },
      { new: true }
    )
      .populate({ path: "members", select: "name photo" })
      .populate({ path: "groupAdmin", select: "name photo" })
      .populate({ path: "lastMessage" });

    console.log(6);
    // populate the sentBy field in the lastMessage
    updatedGroup = await User.populate(updatedGroup, {
      path: "lastMessage.sentBy",
      select: "name photo",
    });

    // delete group if members are less than 3
    if (updatedGroup.members.length < 3) {
      await Chat.findByIdAndDelete(chat_id);
      return res.sendStatus(204);
    }
    res.status(200).json(updatedGroup);
  } catch (err) {
    next(err);
  }
};

// change group admin
const changeGroupAdmin = async (req, res, next) => {
  try {
     // check if chat id is provided
     const { chat_id, newAdmin } = req.body;
     if (!chat_id || !newAdmin) return next(createError("fail", 400, "Provide chat id and the new Admin id"));
 
     // check if chat is a group chat
     const isGroupChat = await Chat.findOne({ _id: chat_id, groupChat: true });
     if (!isGroupChat)
       return next(
         createError(
           "fail",
           404,
           "The chat is not a group chat or does not exist"
         )
       );

       // check if the user is a member of the group
    const isGroupMember = await Chat.findOne({ _id: chat_id, groupChat: true, members: req.userInfo.id});
    if (!isGroupMember)
      return next(
        createError(
          "fail",
          404,
          "Not a member of the group"
        )
      );
 
      // check if the person making the change is the groupAdmin
    const isAdmin = await Chat.findOne({
      _id: chat_id,
      groupAdmin: req.userInfo.id,
    });
    if (!isAdmin)
      return next(
        createError("fail", 403, "You are not authorized to make this change")
      );

  // change the groupAdmin
  let updatedGroup = await Chat.findByIdAndUpdate(
    chat_id,
    { groupAdmin: newAdmin },
    { new: true }
  )
    .populate({ path: "members", select: "name photo" })
    .populate({ path: "groupAdmin", select: "name photo" })
    .populate({ path: "lastMessage" });

  console.log(6);
  // populate the sentBy field in the lastMessage
  updatedGroup = await User.populate(updatedGroup, {
    path: "lastMessage.sentBy",
    select: "name photo",
  });
  res.status(200).json(updatedGroup)


  } catch (err) {
    next(err)
  }
}

module.exports = {
  createOneOnOneChat,
  createGroupChat,
  getAllChats,
  getChat,
  addMemberToGroup,
  removeMemberFromGroup,
  renameGroupChat,
  leaveGroupChat,
  changeGroupAdmin
};
