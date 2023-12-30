const path = require("path");

const getCities = async (req, res, next) => {
    try {
        const cityName = req.params.cityname
        let filePath;

        filePath = path.join(
            __dirname,
            "..",
            "public",
            "hotel-cities",
            cityName
          );
          res.status(200).sendFile(filePath);

    } catch (err) {
        next(err)
    }
}