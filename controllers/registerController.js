const User = require('./../models/users')
const bcrypt = require('bcrypt')
const createError = require('./../utils/error')
const sendOutMail = require('../utils/handleEmail')

const register = async (req, res, next) => {

    try {
        const { username, email, password, name } = req.body
        if (!password || !email || !username || !name) return next(createError('fail', 400, "forgot to type in your password or username or email"))
        const encryptedPassword = await bcrypt.hash(password, 12)
        const newUser = new User({
            name,
            username,
            email,
            password: encryptedPassword
        })

        // check if username already exist
        const duplicateUsername = await User.findOne({username: username})
        if (duplicateUsername) {
            return next(createError('fail', 400, "username already exist"))
        }

        // check if email already exist
        const duplicateEmail = await User.findOne({email: email})
        if (duplicateEmail) {
            return next(createError('fail', 400, "email already exist"))
        }

        // There is a pre save hook in the users file, in the models directory, that updates the passwordResetTime property 
        const user = await newUser.save()

        // do not display the password to the user
        user.password = undefined

        await sendOutMail(user)

        res.status(201).json(user)
    } catch (err) {
        next(err)
    }
}

module.exports = { register }