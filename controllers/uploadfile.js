const path = require("path");
const fsPromises = require("fs").promises;
const fs = require("fs");
const sharp = require("sharp");
const User = require("./../models/users");
const createError = require("../utils/error");
const Hotel = require("../models/hotels");
const Room = require("../models/rooms");

const upload_file = async (req, res, next) => {
  try {
    // get the user
    const user = await User.findById(req.userInfo.id);
    if (!user)
      return next(createError("fail", 404, "this user does not exist"));

    const uploadedFiles = req.files;
    // console.log(uploadedFiles)
    let filePath;

    // check if file is the user's profile photo
    if (
      Object.keys(uploadedFiles)[0].startsWith("customerPreferredProfilePhoto")
    ) {
      // filePath = path.join(__dirname, '..', 'public', user.username, Object.keys(uploadedFiles)[0])
      if (!fs.existsSync(path.join(__dirname, "..", "profilePictures", user._id))) {
        await fsPromises.mkdir(
          path.join(__dirname, "..", "profilePictures", user._id)
        );
      }
      filePath = path.join(
        __dirname,
        "..",
        "profilePictures",
        user._id,
        Object.keys(uploadedFiles)[0]
      );

      Object.values(uploadedFiles)[0].mv(filePath, (err) => {
        if (err) return res.json(`${fileName} was not saved. Try again`);
      });

      // sharp(Object.values(uploadedFiles)[0].data)
      //   .resize(500, 500)
      //   .toFile(filePath);

      // await Object.values(uploadedFiles)[0].mv(filePath)
      // update user profile photo in database

      user.photo = Object.keys(uploadedFiles)[0];
      await user.save();
    } else if (Object.keys(uploadedFiles)[0].startsWith("hotels_")) {
      // extract hotel id
      const fileName = Object.keys(uploadedFiles)[0];
      let split1;
      let split2;

      split1 = fileName.split("_");
      split1.splice(0, 1);
      split2 = split1[0].split(".");
      const hotel_id = split2[0];
      console.log("hotel_id: ", hotel_id);
      console.log("fileName: ", fileName);

      if (
        !fs.existsSync(
          path.join(
            __dirname,
            "..",
            "public",
            "hotelsPictures"
          )
        )
      ) {
        await fsPromises.mkdir(
          path.join(
            __dirname,
            "..",
            "public",
            "hotelsPictures"
          )
        );
      }
      if (
        !fs.existsSync(
          path.join(
            __dirname,
            "..",
            "public",
            "hotelsPictures",
            hotel_id
          )
        )
      ) {
        await fsPromises.mkdir(
          path.join(
            __dirname,
            "..",
            "public",
            "hotelsPictures",
            hotel_id
          )
        );
      }

      filePath = path.join(
        __dirname,
        "..",
        "public",
        "hotelsPictures",
        hotel_id,
        fileName
      );
      //    (Object.keys(uploadedFiles)[0]).mv(filePath, (err) => {
      Object.values(uploadedFiles)[0].mv(filePath, (err) => {
        if (err) return res.json(`${fileName} was not saved. Try again`);
      });

      await Hotel.updateOne({ _id: hotel_id }, { $set: { photos: fileName } });
      // user.photo = Object.keys(uploadedFiles)[0]
      // await user.save()
    } else if (Object.keys(uploadedFiles)[0].startsWith("rooms_")) {

      // extract room id
      const roomFileNames = Object.keys(uploadedFiles);
      const fileName = Object.keys(uploadedFiles)[0];
      let split1;
      let split2;

      split1 = fileName.split("_");
      split1.splice(0, 1);
      split2 = split1[0].split(".");
      const room_id = split2[0].substring(0, (split2[0].length) - 1);
      console.log("room_id: ", room_id);
      console.log("fileName: ", fileName);

      if (
        !fs.existsSync(
          path.join(
            __dirname,
            "..",
            "public",
            "roomsPictures"
          )
        )
      ) {
        await fsPromises.mkdir(
          path.join(
            __dirname,
            "..",
            "public",
            "roomsPictures"
          )
        );
      }
      if (
        !fs.existsSync(
          path.join(
            __dirname,
            "..",
            "public",
            "roomsPictures",
            room_id
          )
        )
      ) {
        await fsPromises.mkdir(
          path.join(
            __dirname,
            "..",
            "public",
            "roomsPictures",
            room_id
          )
        );
      }

      for (let key in uploadedFiles) {
        filePath = path.join(
          __dirname,
          "..",
          "public",
          "roomsPictures",
          room_id,
          key
        );
        uploadedFiles[key].mv(filePath, (err) => {
          if (err) return res.json(`${key} was not saved. Try again`);
        });
      }

      await Room.updateOne({ _id: room_id }, { $set: { photos: roomFileNames } })

    } else {
      for (let key in uploadedFiles) {
        filePath = path.join(
          __dirname,
          "..",
          "public",
          user.username,
          key
        );
        uploadedFiles[key].mv(filePath, (err) => {
          if (err) return res.json(`${key} was not saved. Try again`);
        });
      }
    }

    // console.log(uploadedFiles)
    res.json("file(s) uploaded successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = upload_file;
