const Review = require("./../models/reviews");
const Hotel = require("./../models/hotels");
const User = require("./../models/users");
const Booking = require("./../models/bookings")
const createError = require("./../utils/error");

// get all reviews
const getAllReviews = async (req, res, next) => {
  try {
    // This first two lines of code will modify the filter to get all reviews for
    // a particular hotel. If filterObject is empty, then we get all the reviews for all the hotels
    let filterObject = {};
    if (req.params.hotel_id) filterObject.hotel = req.params.hotel_id;
    if (req.query.review_id) filterObject._id = req.query.review_id;
    // if (req.body.email) {
    //   const user = await User.findOne({ email: req.body.email });
    //   if (!user)
    //     return next(createError("fail", 404, "This user does not exist"));
    //   filterObject.customer = user._id;
    // }

    const reviews = await Review.find(filterObject)
      .populate({ path: "hotel", select: "name" })
      .populate({ path: "customer", select: "name" });
    res.status(200).json({
      results: reviews.length,
      status: "success",
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
};

const getAllMyReviews = async (req, res, next) => {
  try {
  
    const reviews = await Review.find({customer: req.userInfo.id})
      .populate({ path: "hotel", select: "name" })
      .populate({ path: "customer", select: "name" });
    console.log('review: ', reviews)
    
    res.status(200).json({
      results: reviews.length,
      status: "success",
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
};

// create review
const createReview = async (req, res, next) => {
  try {
    // confirm the booking ref exists
    const booking = await Booking.findById(req.body.bookingRef)
    if (!booking)
        return next(createError("fail", 404, "This booking reference does not exist"));
    if (!req.params.hotel_id) {
      const hotel = await Hotel.findOne({ name: req.body.hotel });
      if (!hotel)
        return next(createError("fail", 404, "This hotel does not exist"));
      req.body.hotel = hotel._id;
      console.log("req.body.hotel: ", req.body.hotel);
    } else {
      req.body.hotel = req.params.hotel_id;
    }
    // retrieve the logged-in user id from req.userInfo.id
    req.body.customer = req.userInfo.id;
    console.log("req.body.customer: ", req.body.customer);
    const newReview = await Review.create(req.body);

    res.status(201).json({
      status: "success",
      data: newReview,
    });
  } catch (err) {
    next(err);
  }
};

// update a review
const updateReview = async (req, res, next) => {
  try {
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.review_id,
      req.body,
      { new: true }
    );
    if (!updatedReview)
      return next(createError("fail", 404, "This review no longer exists"));
    res.status(201).json({
      status: "success",
      data: updatedReview,
    });
  } catch (err) {
    next(err);
  }
};

// delete a review
const deleteReview = async (req, res, next) => {
  try {
    const deletedReview = await Review.findByIdAndDelete(req.params.review_id);
    if (!deletedReview)
      return next(createError("fail", 404, "This review does not exist"));
    console.log(deletedReview);
    res.status(204).json({
      status: "success",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllReviews,
  createReview,
  updateReview,
  deleteReview,
  getAllMyReviews
};
