const dotenv = require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Room = require("./../models/rooms");
const Booking = require("./../models/bookings");
const createError = require("../utils/error");

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
    // console.log(roomStyle.roomNumbers[0]?._id)
    const room = roomStyle.roomNumbers.find(({ _id }) => _id == room_id);
    // console.log(room)

    // update the unavailable dates for the room
    const unavailableDates = room.unavailableDates.concat(reservedDates);
    // console.log(unavailableDates)
    if (unavailableDates.length >= 2) {
      unavailableDates.sort(compareNumbers);
    }

    // room.unavailableDates = [...unavailableDates]
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

    // save the updated room
    // await roomStyle.save();
  } catch (err) {
    console.log(err);
  }
};

// app.post('/create-checkout-session', async (req, res) => {
const stripeCheckout = async (req, res, next) => {
  const { selectedRooms, reservedDates, hotel_id } = req.body;

  try {
    const numberOfNights = reservedDates.length;

    const roomTypeArray = await Room.find({
      "roomNumbers._id": { $in: selectedRooms },
    }).populate({
      path: "hotel",
      select: "name city",
    });

    // console.log('roomTypeArray: ', roomTypeArray)

    // const promiseList = selectedRooms.map((roomId) => {
    //     return Room.findOne({"roomNumbers._id": roomId}).populate({
    //         path: 'hotel',
    //         select: 'name city'
    //     })
    // })
    // const roomTypeArray = await Promise.all(promiseList)

    // console.log(roomTypeArray)

    // let bookingsArray = []

    // selectedRooms.forEach(selectedRoom => {
    //   roomTypeArray.forEach(roomType => {
    //     roomType.roomNumbers.forEach(roomNumber => {
    //       if (roomNumber._id == selectedRoom) {
    //         let roomDetails = {}
    //         // roomDetails.roomSytleId = roomType._id
    //         roomDetails.hotelName = roomType.hotel.name
    //         roomDetails.city = roomType.hotel.city
    //         roomDetails.roomNumber = roomNumber.number
    //         roomDetails.checkin_date = checkin_date
    //         roomDetails.checkout_date = checkout_date
    //         roomDetails.price_per_night = roomType.price
    //         roomDetails.number_of_nights = numberOfNights
    //         roomDetails.room_type = roomType.title

    //         bookingsArray.push(roomDetails)
    //       }
    //     })
    //   })
    // })

    // // console.log('roomDeatails :', roomDetails)
    // console.log('bookingsArray :', bookingsArray)

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
                  city: roomType.hotel.city,
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
    //   // console.log('event.data: ', event.data)
    //   console.log('event.type: ', event.type)

    // const customer = await stripe.customers.retrieve(
    //   event.data.object.customer
    // );

    // // console.log('customer: ', customer)

    // const selectedRooms = JSON.parse(customer.metadata.selectedRooms)
    // const reservedDates = JSON.parse(customer.metadata.reservedDates)
    // const user_id = customer.metadata.userId
    // const hotel_id = customer.metadata.hotel_id

    // const checkin_date = reservedDates[0]
    // const lastNight = reservedDates[reservedDates.length - 1]

    // const dateObj = new Date(lastNight)
    // dateObj.setDate(dateObj.getDate() + 1)
    // const checkout_date = dateObj
    // console.log('Check out date: ', dateObj)
    // console.log('Check in date: ', checkin_date)
    // console.log('last night: ', lastNight)

    //   // get room information

    //     const numberOfNights = reservedDates.length
    //     const promiseList = selectedRooms.map((roomId) => {
    //         return Room.findOne({"roomNumbers._id": roomId}).populate({
    //             path: 'hotel',
    //             select: 'name city'
    //         })
    //     })
    //     const roomTypeArray = await Promise.all(promiseList)

    //     console.log('roomTypeArray: ', roomTypeArray)

    //     // console.log('bookingsArray :', bookingsArray)

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
      console.log("Check out date: ", dateObj);
      console.log("Check in date: ", checkin_date);
      console.log("last night: ", lastNight);

      // get room information

      const numberOfNights = reservedDates.length;
      // const promiseList = selectedRooms.map((roomId) => {
      //   return Room.findOne({ "roomNumbers._id": roomId }).populate({
      //     path: "hotel",
      //     select: "name city",
      //   });
      // });
      // const roomTypeArray = await Promise.all(promiseList);

      const roomTypeArray = await Room.find({
        "roomNumbers._id": { $in: selectedRooms },
      });

      console.log("roomTypeArray: ", roomTypeArray);

      let newBooking = {};
      newBooking.user = user_id;
      newBooking.hotel = hotel_id;
      newBooking.bookingDetails = [];
      // let bookingsArray = []

      selectedRooms.forEach((selectedRoom, index1) => {
        roomTypeArray.forEach((roomType, index2) => {
          roomType.roomNumbers.forEach((roomNumber, index3) => {
            if (roomNumber._id == selectedRoom) {
              let roomDetails = {};
              // console.log('index1: ', index1)
              // console.log('index2: ', index2)
              // console.log('index3: ', index3)
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

      console.log("confirmedBooking: ", confirmedBooking);

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
