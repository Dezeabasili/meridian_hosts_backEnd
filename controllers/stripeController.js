const dotenv = require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Room = require("./../models/rooms");
const Booking = require("./../models/bookings");
const Hotel = require("./../models/hotels")
const createError = require("../utils/error");
const User = require('./../models/users')
const sendOutMail = require('../utils/handleEmail3')

// function to format date
const formatDate = (value) => {
  let date = new Date(value);
  const day = date.toLocaleString('default', { day: '2-digit' });
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.toLocaleString('default', { year: 'numeric' });
  return day + '-' + month + '-' + year;
}

const updateRoomAvailability = async (room_id, reservedDates) => {
  // console.log(req.body.reservedDates)

  const compareNumbers = (a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  };
  try {
    // get the room style to update
    const roomStyle = await Room.findOne({ "roomNumbers._id": room_id });
    // console.log(roomStyle)
    // get the room to update
    const room = roomStyle.roomNumbers.find(({ _id }) => _id == room_id);
    // console.log(room)

    // update the unavailable dates for the room
    const unavailableDates = room.unavailableDates.concat(reservedDates);
    // console.log(unavailableDates)
    if (unavailableDates.length >= 2) {
      unavailableDates.sort(compareNumbers);
    }

    roomStyle.roomNumbers = roomStyle.roomNumbers.map((roomNumber) => {
      if (roomNumber._id == room_id) {
        return {
          ...roomNumber,
          unavailableDates: [...unavailableDates],
        };
      } else return roomNumber;
    });

    // console.log(roomStyle)

    await Room.updateOne(
      { "roomNumbers._id": room_id },
      {
        $set: {
          "roomNumbers.$.unavailableDates": unavailableDates,
        },
      }
    );

  } catch (err) {
    console.log(err);
  }
};


const stripeCheckout = async (req, res, next) => {
  const { selectedRooms, reservedDates, hotel_id } = req.body;

  try {
    const numberOfNights = reservedDates.length;

    const roomTypeArray = await Room.find({
      "roomNumbers._id": { $in: selectedRooms },
    }).populate({
      path: "hotel",
      select: "name",
    });

    // create customer
    const customer = await stripe.customers.create({
      metadata: {
        userId: req.userInfo.id,
        hotel_id,
        selectedRooms: JSON.stringify(selectedRooms),
        reservedDates: JSON.stringify(reservedDates),
      },
    });

    // console.log('customer: ', customer)

    let line_items = [];

    selectedRooms.forEach((room) => {
      roomTypeArray.forEach((roomType) => {
        roomType.roomNumbers.forEach((roomNumber) => {
          if (roomNumber._id == room) {
            let Obj = {};
            Obj.price_data = {
              currency: "usd",
              product_data: {
                name: roomType.hotel.name,
                description: roomType.title,
                metadata: {
                  id: roomType._id,
                  // city: roomType.hotel.city,
                },
              },
              unit_amount: roomType.price * 100,
            };
            Obj.quantity = numberOfNights;
            line_items.push({ ...Obj });
          }
        });
      });
    });

    // console.log("line_items: ", line_items);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/checkout-success`,
      cancel_url: `${process.env.CLIENT_URL}/hotels/${hotel_id}/all`,
    });

    res.send({ url: session.url });
  } catch (err) {
    next(err);
  }
};


const stripeWebHook = async (req, res, next) => {
  let signinSecret = 
    process.env.SIGNING_SECRET;
  const payload = req.body;

  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, signinSecret);
  } catch (err) {
    console.log(err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      console.log("inside webhook");

      const customer = await stripe.customers.retrieve(
        event.data.object.customer
      );

      // console.log('customer: ', customer)

      const selectedRooms = JSON.parse(customer.metadata.selectedRooms);
      const reservedDates = JSON.parse(customer.metadata.reservedDates);
      const user_id = customer.metadata.userId;
      const hotel_id = customer.metadata.hotel_id;

      const checkin_date = reservedDates[0];
      const lastNight = reservedDates[reservedDates.length - 1];

      const dateObj = new Date(lastNight);
      dateObj.setDate(dateObj.getDate() + 1);
      const checkout_date = dateObj;
      // console.log("Check out date: ", dateObj);
      // console.log("Check in date: ", checkin_date);
      // console.log("last night: ", lastNight);

      // get room information

      const numberOfNights = reservedDates.length;

      const roomTypeArray = await Room.find({
        "roomNumbers._id": { $in: selectedRooms },
      });

      // console.log("roomTypeArray: ", roomTypeArray);

      let newBooking = {};
      newBooking.user = user_id;
      newBooking.hotel = hotel_id;
      newBooking.bookingDetails = [];

      selectedRooms.forEach((selectedRoom, index1) => {
        roomTypeArray.forEach((roomType, index2) => {
          roomType.roomNumbers.forEach((roomNumber, index3) => {
            if (roomNumber._id == selectedRoom) {
              let roomDetails = {};

              roomDetails.roomType_id = roomType._id;
              roomDetails.room_id = selectedRoom;
              roomDetails.roomNumber = roomNumber.number;
              roomDetails.checkin_date = checkin_date;
              roomDetails.checkout_date = checkout_date;
              roomDetails.price_per_night = roomType.price;
              roomDetails.number_of_nights = numberOfNights;
              roomDetails.room_type = roomType.title;

              newBooking.bookingDetails.push({ ...roomDetails });
            }
          });
        });
      });

      // console.log('newBooking: ', newBooking)

      const confirmedBooking = await Booking.create({ ...newBooking });
      const customerDetails = await User.findById(user_id)
      const hotelDetails = await Hotel.findById(hotel_id)

      const bookingDate = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: 'CST',
      }).format(confirmedBooking.createdAt)

      let htmlReceipt = ''
      htmlReceipt = htmlReceipt + `<p>Booking reference: ${confirmedBooking._id}</p>`
      htmlReceipt = htmlReceipt + `<p style="text-transform: capitalize">Customer name: ${customerDetails.name}</p>`
      htmlReceipt = htmlReceipt + `<p style="text-transform: capitalize">Hotel name: <strong>${hotelDetails.name}</strong></p><br/>`
      htmlReceipt = htmlReceipt + `<p>Booking date: ${bookingDate}</p><br/>`
      confirmedBooking.bookingDetails.forEach(detail => {
        htmlReceipt = htmlReceipt + `<p style="text-transform: capitalize">Room type: ${detail.room_type}</p>`
        htmlReceipt = htmlReceipt + `<p>Price per night: $${detail.price_per_night}</p>`
        htmlReceipt = htmlReceipt + `<p>Room number: ${detail.roomNumber}</p>`
        htmlReceipt = htmlReceipt + `<p>Check-in date: ${formatDate(detail.checkin_date)}</p>`
        htmlReceipt = htmlReceipt + `<p>Check-out date: ${formatDate(detail.checkout_date)}</p>`
        htmlReceipt = htmlReceipt + `<p>Number of nights: ${detail.number_of_nights}</p><br/>`
      })
     

      // console.log("confirmedBooking: ", confirmedBooking);
      await sendOutMail(customerDetails, htmlReceipt)

      selectedRooms.forEach(async (room_id) => {
        await updateRoomAvailability(room_id, reservedDates);
      });
    }

    //   console.log(event.type)
    //   console.log(event.data.object)
    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  stripeCheckout,
  stripeWebHook,
};
