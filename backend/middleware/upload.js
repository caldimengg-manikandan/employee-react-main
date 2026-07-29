const multer = require('multer');

// Configure memory storage so files are held in memory buffer for Cloudinary stream upload
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(null, true);
  }

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are allowed.');
    error.code = 'LIMIT_FILE_TYPES';
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
