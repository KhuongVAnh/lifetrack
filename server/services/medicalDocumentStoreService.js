const fs = require("fs")
const path = require("path")

const STORE_DIR = path.resolve(__dirname, "../data")
const STORE_FILE = path.join(STORE_DIR, "medicalDocuments.json")
const UPLOAD_DIR = path.resolve(__dirname, "../uploads/medical-documents")

const ensureStoreReady = async () => {
  await fs.promises.mkdir(STORE_DIR, { recursive: true })
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true })

  if (!fs.existsSync(STORE_FILE)) {
    await fs.promises.writeFile(
      STORE_FILE,
      JSON.stringify({ documents: [] }, null, 2),
      "utf8"
    )
  }
}

const readStore = async () => {
  await ensureStoreReady()
  const raw = await fs.promises.readFile(STORE_FILE, "utf8")

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.documents)) {
      return { documents: [] }
    }
    return parsed
  } catch (_error) {
    return { documents: [] }
  }
}

const writeStore = async (storeData) => {
  await ensureStoreReady()
  const tempPath = `${STORE_FILE}.tmp`
  await fs.promises.writeFile(tempPath, JSON.stringify(storeData, null, 2), "utf8")
  await fs.promises.rename(tempPath, STORE_FILE)
}

const createMedicalDocument = async (payload) => {
  const store = await readStore()
  const nextRecord = {
    document_id: `doc-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    created_at: new Date().toISOString(),
    ...payload,
  }

  store.documents.unshift(nextRecord)
  await writeStore(store)
  return nextRecord
}

const listMedicalDocumentsByPatient = async (patientId) => {
  const store = await readStore()
  return store.documents.filter((item) => Number(item.patient_id) === Number(patientId))
}

module.exports = {
  UPLOAD_DIR,
  createMedicalDocument,
  listMedicalDocumentsByPatient,
}
