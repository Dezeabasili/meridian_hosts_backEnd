const path = require("path");

const getCities = async (req, res, next) => {
  try {
    const cityName = req.params.cityname;
    let filePath;

    filePath = path.join(
      __dirname,
      "..",
      "pictures",
      "hotel-cities",
      cityName,
      ".jpg"
    );

    res.status(200).sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCities };
