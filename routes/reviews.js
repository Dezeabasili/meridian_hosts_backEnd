const express = require('express')
const verifyAccessToken = require('./../middlewares/verifyJWT')
const reviewsController = require('./../controllers/reviewsController')

const router = express.Router({ mergeParams: true })

router.get('/', reviewsController.getAllReviews)

router.get('/myreviews',verifyAccessToken, reviewsController.getAllMyReviews)

router.post('/',verifyAccessToken, reviewsController.createReview)

router.patch('/:review_id', reviewsController.updateReview)

router.delete('/:review_id', reviewsController.deleteReview)


module.exports = router