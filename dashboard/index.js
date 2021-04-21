require("dotenv").config()
const routes = require("./js/routes")

const express = require("express")
const session = require("express-session")
const helmet = require("helmet")
const http = require("http")
const compression = require("compression")

var app = express()
app.use(express.static("public/"))
app.use(compression())
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.urlencoded({ extended: true }))
app.use(
	session({
		secret: process.env.secret,
		resave: true,
		saveUninitialized: true,
		httpOnly: true,
	})
)
app.set("view engine", "pug")
app.set("views", "views/")
app.set("layout", "layouts/main")

routes(app)
http.createServer(app).listen(process.env.port || 80, ready)

function ready() {
	console.debug("Ready!")
}
