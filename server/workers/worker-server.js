/**
 * Worker Server
 * File này khởi tạo và chạy cả 2 worker (ECG Inference + Direct Message Notification)
 * trên một process duy nhất để deploy lên Render free tier.
 */

const path = require("path")
const dotenv = require("dotenv")
const express = require("express")

// Quy tắc ưu tiên env giống `server.js`:
// 1) `server/.env` là nguồn chính.
// 2) Root `.env` chỉ bổ sung key còn thiếu, không override key đã có.
dotenv.config({ path: path.resolve(__dirname, "../.env") })
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false })

const { ecgInferenceWorker } = require("./ecgInferenceWorker")
const { directMessageNotificationWorker } = require("./directMessageNotificationWorker")

// 2 worker tự chạy background ngay khi import, không cần khởi tạo thêm.
const app = express()

const parsePort = () => {
  const fallbackPort = 5001
  const rawPort = process.env.PORT

  if (!rawPort) {
    return { port: fallbackPort, rawPort: "undefined", valid: true }
  }

  const parsedPort = Number.parseInt(rawPort, 10)
  const valid = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536

  return {
    port: valid ? parsedPort : fallbackPort,
    rawPort,
    valid,
  }
}

const portConfig = parsePort()
const PORT = portConfig.port
let isShuttingDown = false

const logWorkerServerEvent = (event, payload = {}) => {
  console.log(
    JSON.stringify({
      event,
      source: "worker-server",
      timestamp: new Date().toISOString(),
      ...payload,
    })
  )
}

logWorkerServerEvent("WORKER_SERVER_PORT_CONFIG", {
  port_env_raw: portConfig.rawPort,
  port_final: PORT,
  port_valid: portConfig.valid,
})

// Health check endpoint để Render có thể monitor.
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    workers: {
      ecgInference: "running",
      directMessageNotification: "running",
    },
  })
})

// Liveness probe.
app.get("/live", (_req, res) => {
  res.status(200).send("OK")
})

// Readiness probe.
app.get("/ready", (_req, res) => {
  res.status(200).send("OK")
})

const closeWorker = async (worker, workerName, eventName) => {
  await worker.close()
  logWorkerServerEvent(eventName, {
    worker: workerName,
  })
}

const server = app.listen(PORT, () => {
  logWorkerServerEvent("WORKER_SERVER_STARTED", {
    port: PORT,
    node_env: process.env.NODE_ENV || "development",
  })
})

const shutdown = (signal) => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  logWorkerServerEvent("WORKER_SERVER_SHUTDOWN_SIGNAL", {
    signal,
  })

  const forceExitTimer = setTimeout(() => {
    console.error(
      JSON.stringify({
        event: "WORKER_SERVER_FORCE_EXIT",
        source: "worker-server",
        timestamp: new Date().toISOString(),
        reason: "Shutdown timeout exceeded",
      })
    )
    process.exit(1)
  }, 30000)

  server.close(async (error) => {
    if (error) {
      clearTimeout(forceExitTimer)
      console.error(
        JSON.stringify({
          event: "WORKER_SHUTDOWN_ERROR",
          source: "worker-server",
          timestamp: new Date().toISOString(),
          reason: error?.message || "UNKNOWN",
        })
      )
      process.exit(1)
      return
    }

    logWorkerServerEvent("WORKER_SERVER_HTTP_CLOSED")

    Promise.resolve()
      .then(() => closeWorker(ecgInferenceWorker, "ecgInference", "ECG_WORKER_CLOSED"))
      .then(() => closeWorker(directMessageNotificationWorker, "directMessageNotification", "DM_NOTIFICATION_WORKER_CLOSED"))
      .then(() => {
        clearTimeout(forceExitTimer)
        process.exit(0)
      })
      .catch((shutdownError) => {
        clearTimeout(forceExitTimer)
        console.error(
          JSON.stringify({
            event: "WORKER_SHUTDOWN_ERROR",
            source: "worker-server",
            timestamp: new Date().toISOString(),
            reason: shutdownError?.message || "UNKNOWN",
          })
        )
        process.exit(1)
      })
  })
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM")
})

process.on("SIGINT", () => {
  shutdown("SIGINT")
})
