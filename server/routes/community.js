const express = require("express")
const {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  listQuestions,
  getQuestion,
  createQuestion,
  createAnswer,
  createComment,
  updateReaction,
  shareQuestion,
  uploadFiles,
} = require("../controllers/communityController")
const { authenticateToken } = require("../middleware/auth")
const { uploadFilesMiddleware } = require("../services/communityUploadService")

const router = express.Router()

router.use(authenticateToken)

const handleCommunityUpload = (req, res, next) => {
  uploadFilesMiddleware(req, res, (error) => {
    if (error) {
      req.uploadError = error
      return uploadFiles(req, res, next)
    }

    return next()
  })
}

router.get("/articles", listArticles)
router.post("/articles", createArticle)
router.patch("/articles/:id", updateArticle)
router.delete("/articles/:id", deleteArticle)
router.get("/articles/:slug", getArticle)

router.get("/questions", listQuestions)
router.post("/questions", createQuestion)
router.get("/questions/:id", getQuestion)
router.post("/questions/:id/answers", createAnswer)
router.post("/questions/:id/comments", createComment)
router.put("/questions/:id/reaction", updateReaction)
router.post("/questions/:id/share", shareQuestion)

router.post("/uploads", handleCommunityUpload, uploadFiles)

module.exports = router
