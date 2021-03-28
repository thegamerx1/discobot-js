const botTalk = require("./botTalk")
const DiscordOauth2 = require("discord-oauth2")
const Discord = require("discord.js")
const http = require("http")
const os = require("os")
const fs = require("fs")
botTalk.init(21901, "localhost")

var lastCommands = []
var botAlive = false
var wasUp = false
var webhook = new Discord.WebhookClient(process.env.webhook_id, process.env.webhook_token)
const oauth = new DiscordOauth2({
	clientId: process.env.client_id,
    clientSecret: process.env.client_secret,
    redirectUri: process.env.redirect_uri
})

setLastCommands()
module.exports = app => {
	app.get("/", (req, res) => {
		res.render("index", {user: req.session.user, title: "Home"})
	})
	app.get("/logout", async (req, res) => {
		await req.session.destroy()
		res.redirect("/")
	})
	app.get("/guilds", guilds)
	app.get("/dashboard/demo", dashDemo)
	app.get("/dashboard/:id", dashboard)
	app.post("/save/:what/:id", dashSave)
	app.get("/login", login)
	app.get("/admin", admin)
	app.get("*", (req, res) => {
		renderError(res, 404, "The file you requested could not be found.")
	})
}

async function setLastCommands() {
	try {
		lastCommands = await botTalk.ask("commands")
		if (!wasUp) {
			console.log("Bot up!")
			webhookLog("<@373769618327601152> Bot is up!")
		}
		botAlive = true
	} catch {
		if (wasUp) {
			console.error("Bot down!")
			webhookLog("<@373769618327601152> Bot is down!")
		}
		botAlive = false
	}
	wasUp = botAlive
	setTimeout(setLastCommands, botAlive ? 30000 : 5000)
}

function webhookLog(msg) {
	if (process.env.webhook_id) {
		webhook.send(msg)
	}
}


function notAlive(res) {
	if (!botAlive) {
		renderError(res, 503, "Currently unavailable")
		return true
	}
}

function notLoggedIn(req) {
	return !(req.session.user && req.session.token)
}

function renderError(res, code, more) {
	res.render("error", {code: code, more: more, desc: http.STATUS_CODES[code], layout: false, title: code})
}

function parseCommands(commands, disabledcmd) {
	var disabled = []
	var enabled = []
	commands.forEach(cmd => {
		if (disabledcmd.includes(cmd)) {
			disabled.push(cmd)
		} else {
			enabled.push(cmd)
		}
	})
	return {disabled, enabled}
}

async function admin(req, res) {
	if (process.env.NODE_ENV == "production") {
		if (notLoggedIn(req))
			return res.redirect("/login")
		if (req.session.user.id !== process.env.owner)
			return renderError(res, 403)
	}

	var data = {bot: 0}
	var logs = "Not available"
	if (botAlive) {
		try {
			data.bot = parseInt((await botTalk.ask("uptime")).uptime)
			if (!req.query.data) logs = (await botTalk.ask("logs")).logs
		} catch {}
	} else {
		try {
			logs = fs.readFileSync(process.env.log, "utf-8")
		} catch {}
	}

	data.memory =  Math.floor(100-os.freemem()/os.totalmem()*100) + "%"

	data.dashboard = process.uptime()*1000
	data.system = os.uptime()*1000

	if (req.query.data) {
		res.send(JSON.stringify(data))
		return
	}

	res.render("admin", {user: req.session.user, title: "Admin", sidebar: "admin",
		data: data, logs: logs
	})
}

function guilds(req, res) {
	if (notAlive(res))
		return
	if (notLoggedIn(req))
		return res.redirect("/login")

	res.render("guilds", {
		user: req.session.user,
		title: "Guilds",
		guilds: req.session.guilds
	})
}


function dashDemo(req, res) {
	if (notAlive(res))
		return
	const data = {
		channels: [
			{name: "DemoJoins", id: 111},
			{name: "DemoEdits", id: 222},
			{name: "DemoDeletes", id: 333}
		],
		commands: ["code", "hl", "8ball", "avatar", "urban"],
		data: {
			logging: {
				joins: 111,
				edits: 222,
				deletes: 333
			},
			disabled_commands: [
				"code",
				"hl",
				"8ball"
			],
		},
		id: "demo"
	}
	const {enabled, disabled} = parseCommands(lastCommands, data.data.disabled_commands)
	data.data.enabled_commands = enabled
	data.data.disabled_commands = disabled
	res.render("dashboard", {user: {username: "pogo"}, title: "Dashboard", guild: data, sidebar: "dashboard"})
}

async function dashboard(req, res) {
	if (notAlive(res))
		return
	if (notLoggedIn(req))
		return res.redirect("/login")

	var found = false
	for (const guild of req.session.guilds) {
		if (guild.id == req.params.id) {
			found = guild.id
		}
	}
	if (found) {
		try {
			const data = await botTalk.ask("guild", {id: found})
			const {enabled, disabled} = parseCommands(lastCommands, data.data.disabled_commands)
			data.data.enabled_commands = enabled
			data.data.disabled_commands = disabled
			res.render("dashboard", {user: req.session.user, title: "Dashboard", guild: data, sidebar: "dashboard"})
		} catch (e) {
			console.error(e)
			renderError(res, 500)
			return
		}
	} else {
		res.redirect("/")
	}
}

async function dashSave(req, res) {
	if (notAlive(res))
		return
	const required = {
		logging: ["edits", "deletes", "joins"],
		commands: []
	}
	var found = false
	if (req.params.id != "demo") {
		if (notLoggedIn(req))
			return res.status(401).send("")

		for (const guild of req.session.guilds) {
			if (guild.id == req.params.id) {
				found = guild.id
			}
		}

		if (!found)
			return res.status(403).send("You dont have access to that guild")
	}
	const type = req.params.what

	if (!(type in required))
		return res.status(400).send("")

	for (const value of required[type]) {
		if (!req.body[value])
			return res.status(400).send("")
	}

	if (type == "commands") {
		if (!req.body.disabled_commands) req.body.disabled_commands = []
		var valid = true
		req.body.disabled_commands.forEach(disabled => {
			if (!lastCommands.includes(disabled)) valid = false
		})
		if (!valid) return res.status(400).send("Invalid commands sent")
	}

	if (req.params.id == "demo") {
		return res.status(200).send("No changes made: demo")
	}

	try {
		await botTalk.ask("save", {data: req.body, type: type, id: found})
		res.status(204).send("")
	} catch (e) {
		console.error(e)
		res.status(500).send("")
	}
}

async function login(req, res) {
	if (notAlive(res))
		return
	if (!req.query.code)
		return res.redirect(oauth.generateAuthUrl({scope: process.env.scopes}))

	oauth.tokenRequest({scope: process.env.scopes, code: req.query.code, grantType: "authorization_code"})
	.catch(e => {
		console.error(e)
		res.redirect("/login")
	})
	.then(async token => {
		req.session.token = token
		const [user, guilds] = await Promise.all([
			oauth.getUser(token.access_token),
			oauth.getUserGuilds(token.access_token)
		])

		let goodGuilds = []
		for (const guild of guilds) {
			if (new Discord.Permissions(guild.permissions).has("ADMINISTRATOR")) {
				goodGuilds.push(guild)
			}
		}

		try {
			req.session.guilds = await botTalk.ask("IsIn", {guilds: goodGuilds})
		} catch (e) {
			console.error(e)
			renderError(res, 500)
			return
		}

		req.session.user = user
		res.redirect("/guilds")
	})
}