require("dotenv").config()
const routes = require("./js/routes")

const express = require("express")
const session = require("express-session")
const helmet = require("helmet")
const https = require("https")
const http = require("http")
const Handlebars = require("express-handlebars")
const compression = require("compression")
const fs = require("fs")

var app = express()

app.use(express.static("public/"))
app.use(compression())
app.use(helmet({contentSecurityPolicy: false}))
app.use(express.urlencoded({extended: true}))
app.use(session({
	secret: process.env.secret,
	resave: true,
	saveUninitialized: true,
	httpOnly: true
}))
app.engine("hbs", Handlebars({
	defaultLayout: "main",
	extname: ".hbs",
	helpers: {
		eq: (v1, v2) => v1 === v2,
		dump: (obj) => JSON.stringify(obj)
	}
}))
app.set("view engine", "hbs")

app.get("/", routes.index)
app.get("/dashboard", routes.dashboard)
app.get("/dashboard/demo", routes.dashDemo)
app.get("/dashboard/:id", routes.dashConfig)
app.post("/save/:what/:id", routes.dashSave)
app.get("/login", routes.login)
app.get("/logout", routes.logout)
app.get("/reload", routes.reload)
app.get("*", routes.notfound)

if (process.env.NODE_ENV == "production") {
	const redirect = express()
	redirect.get("*", (req, res) => {
		res.redirect("https://" + req.headers.host + req.url)
	})

	const keys = {
		key: fs.readFileSync("keys/private.key", "utf-8"),
		cert: fs.readFileSync("keys/certificate.crt", "utf-8")
	}

	http.createServer(redirect).listen(80, ready)
	https.createServer(keys, app).listen(443, ready)
} else {
	http.createServer(app).listen(80, ready)
}

function ready() {
	console.debug("Ready!")
}