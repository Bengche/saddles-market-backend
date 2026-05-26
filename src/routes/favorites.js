const express = require('express');
const router = express.Router();
const { getFavorites, addFavorite, removeFavorite, checkFavorite } = require('../controllers/favoritesController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getFavorites);
router.post('/', protect, addFavorite);
router.delete('/:productId', protect, removeFavorite);
router.get('/check/:productId', protect, checkFavorite);

module.exports = router;
