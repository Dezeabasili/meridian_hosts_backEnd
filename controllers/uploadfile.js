const path = require("path");
const fsPromises = require("fs").promises;
const fs = require("fs");
const sharp = require("sharp");
const User = require("./../models/users");
const createError = require("../utils/error");
const Hotel = require("../models/hotels");
const Room = require("../models/rooms");
const City = require('./../models/cities')
const HotelType = require('./../models/hotelTypes')
const cloudinary = require("cloudinary").v2

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
})

const upload_file = async (req, res, next) => {
  try {
    // get the user
    const user = await User.findById(req.userInfo.id);
    if (!user)
      return next(createError("fail", 404, "this user does not exist"));

    if (req.body.urlArray.length == 0)
      return next(createError("fail", 404, "no secure URL from cloudinary"));

    if (req.body.fileCode == "profilephoto") {
      const photoId = user.photo_id;
      user.photo = req.body.urlArray[0];
      user.photo_id = req.body.public_idArray[0];
      await user.save();
      if (photoId) {
        await cloudinary.uploader.destroy(photoId);
      }
    } else if (req.body.fileCode == "hotelphoto") {
      const hotel = await Hotel.findById(req.body.id);
      if (!hotel)
        return next(createError("fail", 404, "this hotel does not exist"));
      const photoId = hotel.photo_id;
      hotel.photos = req.body.urlArray[0];
      hotel.photo_id = req.body.public_idArray[0];
      await hotel.save();
      if (photoId) {
        await cloudinary.uploader.destroy(photoId);
      }
    } else if (req.body.fileCode == "roomphoto") {
      const room = await Room.findById(req.body.id);
      if (!room)
        return next(createError("fail", 404, "this room does not exist"));
      const photoId = [...room.photo_id];
      room.photos = [...req.body.urlArray];
      room.photo_id = [...req.body.public_idArray];
      await room.save();
      if (photoId.length > 0) {
        for (let i = 0; i < 6; i++) {
          await cloudinary.uploader.destroy(photoId[i]);
        }        
      }
    } else if (req.body.fileCode == "cityphoto") {
      const city = await City.findById(req.body.id);
      if (!city)
        return next(createError("fail", 404, "this city does not exist"));
      const photoId = city.photo_id;
      city.photo = req.body.urlArray[0];
      city.photo_id = req.body.public_idArray[0];
      await city.save();
      if (photoId) {
        await cloudinary.uploader.destroy(photoId);
      }
    } else if (req.body.fileCode == "hoteltypephoto") {
      const hotelType = await HotelType.findById(req.body.id);
      if (!hotelType)
        return next(createError("fail", 404, "this hotelType does not exist"));
      const photoId = hotelType.photo_id;
      hotelType.photo = req.body.urlArray[0];
      hotelType.photo_id = req.body.public_idArray[0];
      await hotelType.save();
      if (photoId) {
        await cloudinary.uploader.destroy(photoId);
      }
    }

    res.status(200).json("file(s) uploaded successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = upload_file;
