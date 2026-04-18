// Hàm chuẩn hóa một field bệnh sử về text thuần để lưu trực tiếp vào database.
const sanitizeHistoryText = (value) => {
  if (value === null || value === undefined) return null

  const text = String(value).trim()
  return text ? text : null
}

// Hàm nối thêm một dòng text mới vào field bệnh sử hiện có mà không ép sang JSON.
const appendHistoryText = (currentValue, nextValue) => {
  const currentText = sanitizeHistoryText(currentValue)
  const nextText = sanitizeHistoryText(nextValue)

  if (!currentText) return nextText
  if (!nextText) return currentText

  return `${currentText}\n${nextText}`
}

module.exports = {
  sanitizeHistoryText,
  appendHistoryText,
}
