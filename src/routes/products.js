const express = require('express');
const router = express.Router();
const { getProducts, getProduct, getCategories, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:slug', getProduct);

router.post('/', adminOnly, createProduct);
router.put('/:id', adminOnly, updateProduct);
router.delete('/:id', adminOnly, deleteProduct);

module.exports = router;
