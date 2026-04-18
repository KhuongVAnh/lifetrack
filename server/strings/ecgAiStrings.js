// Bộ hằng số chuẩn cho 5 lớp AI ECG và quy tắc bình thường/bất thường.
const ECG_AI_CLASS_CODES = ["F", "N", "Q", "S", "V"]
const ECG_AI_SUMMARY_ORDER = ["F", "S", "V", "Q", "N"]
const ECG_AI_NORMAL_CODES = new Set(["N", "Q"])

const ECG_AI_CLASS_LABELS_VI = {
  F: "Nhịp hợp nhất",
  N: "Bình thường",
  Q: "Không xác định",
  S: "Rung nhĩ",
  V: "Ngoại tâm thu",
}

// Hàm chuẩn hóa text để phục vụ map nhãn AI.
const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

// Hàm kiểm tra một mã lớp có thuộc nhóm bình thường hay không.
const isNormalAiCode = (code) => ECG_AI_NORMAL_CODES.has(String(code || "").trim().toUpperCase())

// Hàm lấy nhãn hiển thị tiếng Việt từ mã lớp AI.
const getAiLabelFromCode = (code) => {
  const normalized = String(code || "").trim().toUpperCase()
  return ECG_AI_CLASS_LABELS_VI[normalized] || normalized || null
}

// Hàm suy ra mã lớp AI từ chuỗi nhãn (code/english/việt).
const resolveAiCodeFromLabel = (label) => {
  const normalized = normalizeText(label)
  if (!normalized) return null

  const byCode = ECG_AI_CLASS_CODES.find((code) => code.toLowerCase() === normalized)
  if (byCode) return byCode

  if (normalized === "afib" || normalized === "rung nhi") return "S"
  if (normalized === "ngoai tam thu") return "V"
  if (normalized === "fusion" || normalized === "nhip hop nhat") return "F"
  if (normalized === "unknown" || normalized === "khong xac dinh") return "Q"
  if (normalized === "normal" || normalized === "binh thuong") return "N"
  return null
}

module.exports = {
  ECG_AI_CLASS_CODES,
  ECG_AI_SUMMARY_ORDER,
  ECG_AI_NORMAL_CODES,
  ECG_AI_CLASS_LABELS_VI,
  isNormalAiCode,
  getAiLabelFromCode,
  resolveAiCodeFromLabel,
}
