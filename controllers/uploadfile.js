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

const upload_file = async (req, res, next) => {
  try {
    // get the user
    const user = await User.findById(req.userInfo.id);
    if (!user)
      return next(createError("fail", 404, "this user does not exist"));

    if (req.body.urlArray.length == 0)
      return next(createError("fail", 404, "no secure URL from cloudinary"));

    if (req.body.fileCode == "profilephoto") {
      user.photo = req.body.urlArray[0];
      await user.save();
    } else if (req.body.fileCode == "hotelphoto") {

      await Hotel.findByIdAndUpdate(req.body.id, {
        $set: { photos: req.body.urlArray[0] },
      });

    } else if (req.body.fileCode == "roomphoto") {

      await Room.findByIdAndUpdate(req.body.id, {
        $set: { photos: req.body.urlArray },
      });

    } else if (req.body.fileCode == "cityphoto") {

      await City.findByIdAndUpdate(req.body.id, {
        $set: { photo: req.body.urlArray[0] },
      });

    } else if (req.body.fileCode == "hoteltypephoto") {

      await HotelType.findByIdAndUpdate(req.body.id, {
        $set: { photo: req.body.urlArray[0] },
      });

    }

    res.status(200).json("file(s) uploaded successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = upload_file;
