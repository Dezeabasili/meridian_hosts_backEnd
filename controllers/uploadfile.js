const path = require("path");
const fsPromises = require("fs").promises;
const fs = require("fs");
const sharp = require("sharp");
const User = require("./../models/users");
const createError = require("../utils/error");
const Hotel = require("../models/hotels");
const Room = require("../models/rooms");

// Everything will change in order to use Cloudinary to store the images
// The models will also be updated to store the URL's from Cloudinary.
// This is to allow the user to upload files.
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
      const hotel = await Hotel.findById(req.body.id);
      if (!hotel)
        return next(createError("fail", 404, "this hotel does not exist"));
      hotel.photos = req.body.urlArray[0];
      await hotel.save()
    }

    res.status(200).json("file(s) uploaded successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = upload_file;
