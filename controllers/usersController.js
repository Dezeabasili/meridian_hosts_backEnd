const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");
const createError = require("../utils/error");
const sendMail = require("../utils/handleEmail");
const User = require("./../models/users");
const Booking = require("./../models/bookings");
const Hotel = require("./../models/hotels");
const Review = require("./../models/reviews");
const sendOutMail = require('../utils/handleSubscriptionEmail')

// get all users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json({
      number: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// get a specific user
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.user_id);
    if (!user)
      return next(createError("fail", 404, "this user does not exist"));
    res.status(200).json({
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
// get a specific user by user email
const findUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return next(createError("fail", 404, "this user does not exist"));
    res.status(200).json({
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// update a specific user
const updateUser = async (req, res, next) => {
  try {
    let Obj = {};
    if (req.body.roles) {
      if (
        req.body.roles * 1 != 2010 &&
        req.body.roles * 1 != 2020 &&
        req.body.roles * 1 != 2030
      )
        return next(
          createError("fail", 404, "user's role can only be 2010, 2020 or 2030")
        );

      Obj.roles = req.body.roles * 1;
    }

    if (req.body.active) {
      if (req.body.active.toLowerCase() === "yes") {
        Obj.active = true;
      } else if (req.body.active.toLowerCase() === "no") {
        Obj.active = false;
      }
    }
    

    const user = await User.updateOne(
      { email: req.body.email },
      { $set: Obj }
    );
    console.log('user: ', user)
    if (user.matchedCount === 0)
      return next(createError("fail", 404, "This user does not exist"));
    
    res.status(200).json({
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// Admin deletes a specific user
const deleteUser = async (req, res, next) => {
  try {
    // check if the user exists
    const userToDelete = await User.findById(req.params.user_id)
    if (!userToDelete)
      return next(createError("fail", 404, "this user does not exist"));

    // delete user's bookings
    await Booking.deleteMany({ user: req.params.user_id });

    // delete user's reviews
    await Review.deleteMany({ customer: req.params.user_id });

    // delete user from hotel information if user is a staff or a manager
    const hotel = await Hotel.find({
      $or: [{ manager: req.params.user_id }, { staff: req.params.user_id }],
    });

    if (hotel.length > 0) {
      hotel.forEach(async (eachHotel) => {
        if (eachHotel.manager._id == req.params.user_id) {
          eachHotel.manager = undefined;
        }
        eachHotel.staff = eachHotel.staff.filter(
          (eachStaff) => eachStaff._id != req.params.user_id
        );
        await eachHotel.save()
      });
    }

    await User.findByIdAndDelete(req.params.user_id);
    

    res.status(204).json("User has been deleted");
  } catch (err) {
    next(err);
  }
};

// get user categories
const usersByCategories = async (req, res, next) => {
  try {
    const userCategories = await User.aggregate([
      {
        $unwind: "$roles",
      },
      {
        $group: {
          _id: "$roles",
          numInCategory: { $sum: 1 },
          personsInCategory: { $push: "$username" },
        },
      },
      {
        $addFields: { role: "$_id" },
      },
      {
        $project: { _id: 0 },
      },
      {
        $sort: { numInCategory: -1 },
      },
    ]);
    res.status(200).json({
      data: userCategories,
    });
  } catch (err) {
    next(err);
  }
};

// the request handler below is for a logged in user who wants to change his/her data in the database
const updateMyAccount = async (req, res, next) => {
  try {
    // get user with the user id
    const loggedInUser = await User.findById(req.userInfo.id);
    if (!loggedInUser)
      return next(createError("fail", 404, "This user no longer exists"));

    // get user information to update
    if (req.body.email) loggedInUser.email = req.body.email;
    if (req.body.username) loggedInUser.username = req.body.username;
    if (req.body.name) loggedInUser.name = req.body.name;
    if (!req.body.email && !req.body.username && !req.body.name)
      return next(
        createError(
          "fail",
          400,
          "You did not provide any information to update"
        )
      );

    // update user information
    await loggedInUser.save();

    res.status(200).json("Your information has been updated");
  } catch (err) {
    next(err);
  }
};

// the request handler below is for a logged in user who wants to delete his/her account
const deleteMyAccount = async (req, res, next) => {
  try {
    // get user with the user id
    const loggedInUser = await User.findById(req.userInfo.id).select("+active");
    if (!loggedInUser)
      return next(createError("fail", 404, "This user no longer exists"));

    // deactivate user
    loggedInUser.active = false;

    // update user information
    await loggedInUser.save();

    // there is a query middleware in the user Schema that includes only users with active: true
    // before any query beginning with 'find' is executed.

    res.status(204).json("Sorry to see you leave");
  } catch (err) {
    next(err);
  }
};

// the request handler below is for a logged in user who wants to see his/her account information
const seeMyAccount = async (req, res, next) => {
  try {
    //get user with the user id
    const loggedInUser = await User.findById(req.userInfo.id);
    if (!loggedInUser)
      return next(createError("fail", 404, "This user no longer exists"));

    // res.sendFile(path.join(__dirname, '..', 'views', "mines.html"));
    res.status(200).json({
      data: loggedInUser,
    });
  } catch (err) {
    next(err);
  }
};

// the request handler below is for updating the user's profile photo
const seeMyPhoto = async (req, res, next) => {
  try {
    // get user with the user id
    const loggedInUser = await User.findById(req.userInfo.id);
    if (!loggedInUser)
      return next(createError("fail", 404, "This user no longer exists"));

    let filePath;
    if (loggedInUser.photo === "default_profile_pic.png") {
      filePath = path.join(
        __dirname,
        "..",
        "public",
        "default_profile_pic.png"
      );

      return res.status(200).sendFile(filePath)
    } else {
      return res.status(200).json({data: loggedInUser.photo});
    }
 
  } catch (err) {
    next(err);
  }
};


const handleSubscription = async (req, res, next) => {
  try {
    //get user with the submitted email
    const user = await User.findOne({email: (req.body.email).toLowerCase()});
    if (!user)
      return next(createError("fail", 404, "This user does not exist"));

    user.password = undefined

    await sendOutMail(user)

    res.status(200).json('Thank you for subscribing to our news letters');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  findUser,
  updateUser,
  deleteUser,
  usersByCategories,
  updateMyAccount,
  deleteMyAccount,
  seeMyAccount,
  seeMyPhoto,
  handleSubscription
};
