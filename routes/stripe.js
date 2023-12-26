// const stripe = require('stripe')('sk_test_51NpDWKB56Ozf5qSQ6UeDuMyUsXK3YJDqHgKGifrAOOudR7MrIuIgAZjTPaO2OSX9NQx4hlXawvmGdW4QHwejsIKu00c5KVV9jB')
const express = require('express')
const {stripeCheckout, stripeWebHook} = require('../controllers/stripeController')
const verifyAccessToken = require('./../middlewares/verifyJWT')

const router = express.Router()

router.post('/create-checkout-session', verifyAccessToken, stripeCheckout)
router.post('/stripe-webhook', express.raw({type: 'application/json'}), stripeWebHook)

module.exports = router