const createError = require('./../utils/error')
const User = require('./../models/users')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const passwordResetMail = require('../utils/passwordResetEmail')



const login = async (req, res, next) => {
    const pwd = req.body.password
    const username = req.body.username.toLowerCase()

    try {
        if (!pwd || !username) return next(createError('fail', 400, "forgot to type in your password or username"))
        const user = await User.findOne({ username }).select('+password')

        if (!user) return next(createError('fail', 400, "no user matches the provided information"))

        // alternative way to compare user password and the encrypted password
        // using an instance method defined in the userSchema file.
        // const pwdCorrect = user.comparePasswords(pwd)

        const pwdCorrect = await bcrypt.compare(pwd, user.password)
        if (!pwdCorrect) return next(createError('fail', 400, 'Sorry, cannot log you in'))

        const accessToken = jwt.sign({ id: user._id, assignedRoles: user.roles }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
        const refreshToken = jwt.sign({ id: user._id, assignedRoles: user.roles }, process.env.REFRESH_TOKEN, { expiresIn: '1d' })

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        const assignedRoles = user.roles
        const profilePhoto = user.photo
        const user_id = user._id

        res.status(200).json({
            accessToken,
            assignedRoles,
            profilePhoto,
            user_id
        })

    } catch (err) {
        next(err)
    }
}


// the next two request handlers are for users who forgot their passwords.
// such users should be able to remember their registered emails.
const forgotPassword = async (req, res, next) => {
    try {
        // email address from the user is the only information known 
        const user = await User.findOne({ email: req.body.email })
        if (!user) return next(createError('fail', 404, 'this user does not exist'))

        // generate a random rest token
        const randomToken = crypto.randomBytes(32).toString('hex')
        const token = await bcrypt.hash(randomToken, 12)

        user.passwordResetToken = token
        user.passwordTokenExpiration = Date.now() + 10 * 60 * 1000 //expires after 10 min
        await user.save()

        // send the generated token to the user's email
        const passwordResetURL = `${process.env.CLIENT_URL}/resetpassword/${randomToken}/${user._id}`
        try {
            await passwordResetMail(user, passwordResetURL)

            res.status(200).json({
                status: 'success',
                message: 'Token sent to your email'
            })
        } catch (err) {
            user.passwordResetToken = undefined
            user.passwordTokenExpiration = undefined
            await user.save()
            return next(createError('fail', 500, 'Email was not sent. Please try again'))
        }

    } catch (err) {
        next(err)
    }
}

const resetPassword = async (req, res, next) => {
    try {
        // get the user that owns the reset token
        const user = await User.findById(req.params.user_id)
        if (!user) return next(createError('fail', 404, 'this user does not exist'))
        const token = req.params.resettoken

        // confirm the reset token
        const pwdCorrect = await bcrypt.compare(token, user.passwordResetToken)
        if (!pwdCorrect) return next(createError('fail', 401, 'Token has been tampered with. Please request for another password reset token in the forgot password link'))

        // confirm reset token has not expired
        const notExpired = Date.now() < new Date(user.passwordTokenExpiration).getTime()
        if (!notExpired) return next(createError('fail', 401, 'Token has expired. Please request for another password reset token in the forgot password link'))

        // encrypt new password and save to database
        const pwd = req.body.password
        if (!pwd) return next(createError('fail', 400, "forgot to provide your new password"))
        const encryptedPassword = await bcrypt.hash(pwd, 12)
        user.password = encryptedPassword
        //see the pre save hook in the users file, in the model directory, as an alternative way of setting the passwordResetTime property
        user.passwordResetTime = new Date()
        user.passwordTokenExpiration = undefined
        user.passwordResetToken = undefined
        await user.save()

        res.status(200).json("Password reset was successful. Please sign in with your new password ")
    } catch (err) {
        next(err)
    }

}

// the request handler below is for a logged in user who wants to change his/her password
// the user is required to know his/her current password
const changePassword = async (req, res, next) => {
    try {
        // get the user with the user id
        const loggedInUser = await User.findById(req.userInfo.id).select('+password')
        if (!loggedInUser) return next(createError('fail', 404, 'This user no longer exists'))

        // compared the provided password with the password in the database
        const pwdCorrect = await bcrypt.compare(req.body.currentPassword, loggedInUser.password)
        if (!pwdCorrect) return next(createError('fail', 401, 'Your password is incorrect. Please provide the correct password'))

        // encrypt the new password and save to database
        const encryptedPassword = await bcrypt.hash(req.body.password, 12)
        loggedInUser.password = encryptedPassword
        loggedInUser.passwordResetTime = new Date()
        await loggedInUser.save()

        res.status(200).json("Password reset was successful. Please sign in with your new password ")
    } catch (err) {
        next(err)
    }
}

module.exports = {
    login,
    forgotPassword,
    resetPassword,
    changePassword
}