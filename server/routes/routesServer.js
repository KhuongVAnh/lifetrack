const express = require("express")
const prisma = require("../prismaClient")
const router = express.Router()

router.get("/readings", async (req, res) => {
    const data = await prisma.reading.findMany({
        orderBy: { timestamp: "desc" },
        take: 20,
    })
    res.render("readings", { readings: data })
});

module.exports = router
