const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const getEnvOrSecret = (key) => {
  if (process.env[key] && process.env[key].trim()) {
    return process.env[key].trim();
  }
  const secretPaths = [
    `/etc/secrets/${key}`,
    `./${key}`,
    `../${key}`
  ];
  for (const p of secretPaths) {
    try {
      if (fs.existsSync(p)) {
        const val = fs.readFileSync(p, 'utf8').trim();
        if (val) return val;
      }
    } catch (e) {}
  }
  return '';
};

cloudinary.config({
  cloud_name: getEnvOrSecret('CLOUDINARY_CLOUD_NAME'),
  api_key: getEnvOrSecret('CLOUDINARY_API_KEY'),
  api_secret: getEnvOrSecret('CLOUDINARY_API_SECRET'),
  secure: true
});

/**
 * Uploads an image buffer to Cloudinary with automatic quality & format optimisation and limit resizing.
 * @param {Buffer} fileBuffer 
 * @param {string} employeeId 
 * @returns {Promise<{ profilePicture: string, profilePicturePublicId: string }>}
 */
const uploadEmployeeProfilePicture = (fileBuffer, employeeId = 'general') => {
  return new Promise((resolve, reject) => {
    const folderPath = `employee_profiles/${String(employeeId).trim() || 'general'}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        transformation: [
          { width: 400, height: 400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          profilePicture: result.secure_url,
          profilePicturePublicId: result.public_id
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Uploads a Base64 image string to Cloudinary.
 * Used during data migration.
 * @param {string} base64Str 
 * @param {string} employeeId 
 * @returns {Promise<{ profilePicture: string, profilePicturePublicId: string }>}
 */
const uploadBase64EmployeePicture = async (base64Str, employeeId = 'general') => {
  const folderPath = `employee_profiles/${String(employeeId).trim() || 'general'}`;
  const result = await cloudinary.uploader.upload(base64Str, {
    folder: folderPath,
    transformation: [
      { width: 400, height: 400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
    ]
  });
  return {
    profilePicture: result.secure_url,
    profilePicturePublicId: result.public_id
  };
};

/**
 * Safely deletes an image from Cloudinary by its public ID.
 * @param {string} publicId 
 * @returns {Promise<any>}
 */
const deleteCloudinaryImage = async (publicId) => {
  if (!publicId || typeof publicId !== 'string' || !publicId.trim()) {
    return null;
  }
  try {
    const result = await cloudinary.uploader.destroy(publicId.trim());
    return result;
  } catch (error) {
    console.error(`Error deleting Cloudinary image (${publicId}):`, error.message);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadEmployeeProfilePicture,
  uploadBase64EmployeePicture,
  deleteCloudinaryImage
};
