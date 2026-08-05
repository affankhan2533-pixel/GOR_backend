const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
  * Check if Cloudinary credentials are configured properly
  */
function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET &&
    CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
    CLOUDINARY_API_KEY !== "your_api_key" &&
    CLOUDINARY_API_SECRET !== "your_api_secret"
  );
}

/**
  * Upload a Buffer to Cloudinary using stream
  * @param {Buffer} buffer 
  * @param {Object} options 
  */
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error("Cloudinary environment variables are not configured in backend/.env"));
    }

    const defaultFolder = process.env.CLOUDINARY_FOLDER || "gormenswear";
    const uploadOptions = {
      folder: options.folder ? `${defaultFolder}/${options.folder}` : defaultFolder,
      resource_type: options.resourceType || "auto",
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
  * Upload Base64 Data URI or Remote File URL to Cloudinary
  * @param {string} fileInput - Base64 data string, file path, or remote URL
  * @param {Object} options 
  */
async function uploadToCloudinary(fileInput, options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary environment variables are not configured in backend/.env");
  }

  const defaultFolder = process.env.CLOUDINARY_FOLDER || "gormenswear";
  const uploadOptions = {
    folder: options.folder ? `${defaultFolder}/${options.folder}` : defaultFolder,
    resource_type: options.resourceType || "auto",
    ...options,
  };

  return await cloudinary.uploader.upload(fileInput, uploadOptions);
}

/**
  * Delete file from Cloudinary by public ID
  * @param {string} publicId 
  * @param {string} resourceType - "image", "video", or "raw"
  */
async function deleteFromCloudinary(publicId, resourceType = "image") {
  if (!publicId || !isCloudinaryConfigured()) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
    return null;
  }
}

/**
  * Generate Cloudinary variants/transformed URLs
  * @param {string} publicId 
  */
function getCloudinaryVariants(publicId) {
  if (!publicId || !isCloudinaryConfigured()) return null;

  return {
    thumbnail: cloudinary.url(publicId, { width: 300, height: 300, crop: "fill", quality: "auto", fetch_format: "auto" }),
    small: cloudinary.url(publicId, { width: 600, crop: "scale", quality: "auto", fetch_format: "auto" }),
    medium: cloudinary.url(publicId, { width: 1200, crop: "scale", quality: "auto", fetch_format: "auto" }),
    large: cloudinary.url(publicId, { width: 1920, crop: "scale", quality: "auto", fetch_format: "auto" }),
  };
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryVariants,
};
