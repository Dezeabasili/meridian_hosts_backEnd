const jwt = require('jsonwebtoken')
const createError = require('../utils/error')
const User = require('./../models/users')


const renewAccessToken = async (req, res, next) => {
    // get refresh token from cookie
    const refreshToken = req.cookies?.jwt
    if (!refreshToken) return res.sendStatus(401) // unauthorized
    let user_id;

    // verify the refresh token
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN,
        (error, userInfo) => {
            if (error) return res.sendStatus(403) // Forbidden

            // userInfo has the user id and assigned roles
            user_id = userInfo.id
        }
    )
    // check if user still exists
    const user = await User.findById(user_id)
    if (!user) return res.sendStatus(401) // unauthorized
    // console.log(user)

    // generate new access token
    const accessToken = jwt.sign({ id: user._id, assignedRoles: user.roles }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })

    res.json({ accessToken, assignedRoles: user.roles, user_id: user._id })
}

module.exports = renewAccessToken