const logout = async (req, res, next) => {
    const refreshToken = req.cookies?.jwt

    if (!refreshToken) return res.sendStatus(204)

    res.clearCookie('jwt', { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 })
    res.sendStatus(204)
}

module.exports = logout