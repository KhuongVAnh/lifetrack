const { GoogleGenerativeAI } = require("@google/generative-ai")

const fallbackSummary = (ocrText) => {
  const compact = String(ocrText || "").replace(/\s+/g, " ").trim()
  const shortPreview = compact.slice(0, 280)

  return {
    tom_tat: shortPreview || "Chưa có nội dung OCR rõ ràng.",
    chan_doan_goi_y: "Cần bác sĩ xác nhận lại từ tài liệu gốc.",
    chi_so_quan_trong: {
      nhip_tim: null,
      huyet_ap: null,
      khac: [],
    },
    khuyen_nghi: "Đối chiếu bản gốc và kết quả xét nghiệm trước khi ra quyết định điều trị.",
  }
}

const tryParseJson = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch (_error) {
    const matched = String(value).match(/\{[\s\S]*\}/)
    if (!matched) return null

    try {
      return JSON.parse(matched[0])
    } catch (_error2) {
      return null
    }
  }
}

const summarizeMedicalText = async (ocrText) => {
  const normalizedText = String(ocrText || "").trim()
  if (!normalizedText) {
    return fallbackSummary(ocrText)
  }

  if (!process.env.GEMINI_API_KEY) {
    return fallbackSummary(ocrText)
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `
Bạn là trợ lý hỗ trợ bác sĩ tóm tắt tài liệu y khoa OCR.
Hãy trả về JSON hợp lệ duy nhất (không markdown) theo schema:
{
  "tom_tat": "...",
  "chan_doan_goi_y": "...",
  "chi_so_quan_trong": {
    "nhip_tim": "... hoặc null",
    "huyet_ap": "... hoặc null",
    "khac": ["...", "..."]
  },
  "khuyen_nghi": "..."
}
Nếu không tìm thấy thông tin, điền null hoặc chuỗi mô tả ngắn.

Nội dung OCR:
${normalizedText}
`

    const response = await model.generateContent(prompt)
    const responseText = response.response.text()
    const parsed = tryParseJson(responseText)

    return parsed || fallbackSummary(normalizedText)
  } catch (error) {
    console.error("AI_SUMMARY_ERROR", error?.message || error)
    return fallbackSummary(normalizedText)
  }
}

module.exports = {
  summarizeMedicalText,
}
