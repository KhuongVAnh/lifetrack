const { PrismaClient } = require("@prisma/client")

const ensureDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return
  }

  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const pass = process.env.DB_PASS
  const name = process.env.DB_NAME
  const port = process.env.DB_PORT || "3306"

  if (!host || !user || !name) {
    return
  }

  const encodedUser = encodeURIComponent(user)
  const encodedPass = pass ? `:${encodeURIComponent(pass)}` : ""
  process.env.DATABASE_URL = `mysql://${encodedUser}${encodedPass}@${host}:${port}/${name}`
}

ensureDatabaseUrl()

const prisma = new PrismaClient()

module.exports = prisma
