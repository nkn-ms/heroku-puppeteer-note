const express = require("express")
const path = require("path")
const PORT = process.env.PORT || 5000
const cors = require("cors")

const goScraping = require("./scraping")

const app = express()
app.use(express.static(path.join(__dirname, "dist")))
app.use(cors())

app.get("/detail/:id", (req, res) =>
  res.sendFile(__dirname + "/dist/index.html")
)
app.get("/scraping", (req, res) => {
  goScraping.then(data => {
    return res.json({
      status: "ok",
      scraping: data,
    })
  })
})
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"))

app.listen(PORT, () => console.log(`Listening on ${PORT}`))
