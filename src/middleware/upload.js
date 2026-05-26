const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "saddles-market/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: "limit",
        quality: "auto:best",
        fetch_format: "auto",
      },
    ],
  },
});

const blogStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "saddles-market/blog",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 1200,
        height: 630,
        crop: "fill",
        quality: "auto:good",
        fetch_format: "auto",
      },
    ],
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed."), false);
  }
};

const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 10, // Max 10 images per product
  },
}).array("images", 10);

const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

const uploadBlogImage = multer({
  storage: blogStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

module.exports = { uploadProductImages, uploadSingleImage, uploadBlogImage };
