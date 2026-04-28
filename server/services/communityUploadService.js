const { Readable } = require("stream")
const multer = require("multer")
const { v2: cloudinary } = require("cloudinary")

const MAX_FILES = Number.parseInt(process.env.COMMUNITY_UPLOAD_MAX_FILES || "5", 10)
const MAX_MB = Number.parseInt(process.env.COMMUNITY_UPLOAD_MAX_MB || "10", 10)
const MAX_BYTES = Math.max(MAX_MB, 1) * 1024 * 1024
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_COMMUNITY_FOLDER || "lifetrack"

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])

const hasCloudinaryConfig = () => Boolean(
  process.env.CLOUDINARY_URL ||
  (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
)

const configureCloudinary = () => {
  if (!hasCloudinaryConfig()) return false

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    })
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })
  }

  return true
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(new Error("UNSUPPORTED_FILE_TYPE"))
    }

    return callback(null, true)
  },
})

const uploadFilesMiddleware = upload.array("files", MAX_FILES)

const uploadBufferToCloudinary = (file) => {
  if (!configureCloudinary()) {
    const error = new Error("CLOUDINARY_NOT_CONFIGURED")
    error.status = 503
    throw error
  }

  const resourceType = file.mimetype === "application/pdf" ? "raw" : "image"

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error)
        return resolve(result)
      }
    )

    Readable.from(file.buffer).pipe(stream)
  })
}

const mapCloudinaryResult = (file, result) => ({
  url: result.url,
  secure_url: result.secure_url,
  public_id: result.public_id,
  resource_type: result.resource_type,
  format: result.format || null,
  bytes: Number(result.bytes || file.size || 0),
  original_name: file.originalname || null,
})

const uploadCommunityFiles = async (files = []) => {
  if (!Array.isArray(files) || !files.length) return []

  const uploaded = []
  for (const file of files) {
    const result = await uploadBufferToCloudinary(file)
    uploaded.push(mapCloudinaryResult(file, result))
  }

  return uploaded
}

module.exports = {
  uploadFilesMiddleware,
  uploadCommunityFiles,
  MAX_FILES,
  MAX_MB,
}
