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

app.use((req, res, next) => {
	switch (req.hostname) {
		case "discobot.ml":
			next()
			return
		case "www.discobot.ml":
			res.redirect(301, "https://discobot.ml" + req.originalUrl)
			return
		case "localhost":
			if (process.env.NODE_ENV !== "production") {
				next()
				return
			}
		default:
			res.sendStatus(400)
	}
})
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
app.get("/guilds", routes.guilds)
app.get("/dashboard/demo", routes.dashDemo)
app.get("/dashboard/:id", routes.dashboard)
app.post("/save/:what/:id", routes.dashSave)
app.get("/login", routes.login)
app.get("/logout", routes.logout)
app.get("/reload", routes.reload)
app.get("/admin", routes.admin)
app.get("*", routes.notfound)
if (process.env.NODE_ENV == "production") {
	const redirect = express()
	redirect.get("*", (req, res) => {
		res.redirect("https://" + req.headers.host + req.url)
	})

	const keys = {
		key: fs.readFileSync(process.env.cert_key, "utf-8"),
		cert: fs.readFileSync(process.env.cert_pem, "utf-8")
	}

	http.createServer(redirect).listen(80, ready)
	https.createServer(keys, app).listen(443, ready)
} else {
	http.createServer(app).listen(80, ready)
}

function ready() {
	console.debug("Ready!")
}