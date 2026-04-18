const fs = require("fs")
const pdfParse = require("pdf-parse")
const { createWorker } = require("tesseract.js")

const extractTextFromPdf = async (filePath) => {
  const dataBuffer = await fs.promises.readFile(filePath)
  const data = await pdfParse(dataBuffer)
  return (data.text || "").trim()
}

const extractTextFromImage = async (filePath) => {
  const worker = await createWorker("eng")

  try {
    const result = await worker.recognize(filePath)
    return (result?.data?.text || "").trim()
  } finally {
    await worker.terminate()
  }
}

const extractMedicalText = async ({ filePath, mimeType }) => {
  const normalizedMime = (mimeType || "").toLowerCase()

  if (normalizedMime.includes("pdf")) {
    const pdfText = await extractTextFromPdf(filePath)
    if (pdfText) return pdfText
  }

  if (normalizedMime.startsWith("image/")) {
    return extractTextFromImage(filePath)
  }

  if (normalizedMime.includes("pdf")) {
    return ""
  }

  throw new Error("UNSUPPORTED_DOCUMENT_TYPE")
}

module.exports = {
  extractMedicalText,
}
