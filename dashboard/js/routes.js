const botTalk = require("./botTalk")
const DiscordOauth2 = require("discord-oauth2")
const Discord = require("discord.js")
const http = require("http")
const os = require("os")
const fs = require("fs")
const child_process = require("child_process")
botTalk.init(21901, "localhost")

const SAVE_REQUIRED = {
	logging: ["edits", "deletes", "joins"],
	commands: [],
	randomreact: []
}

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
		res.render("index", {user: req.session.user})
	})
	app.get("/reload", reload)
	app.get("/logout", async (req, res) => {
		await oauth.revokeToken(req.session.token.access_token)
		await req.session.destroy()
		res.redirect("/")
	})
	app.get("/guilds", async (req, res) => {
		if (notAlive(res)) return
		if (notLoggedIn(req)) return res.redirect("/login")

		if (req.session.guildsLoadedAt - new Date() > 5*60*1000) {
			await loadUser(req, req.session.token)
		}

		res.render("guilds", {
			user: req.session.user,
			guilds: req.session.guilds
		})
	})
	app.get("/dashboard/demo", dashDemo)
	app.get("/dashboard/:id", dashboard)
	app.post("/save/:what/:id", dashSave)
	app.get("/login", login)

	app.get("/admin", admin)
	app.get("/admin/:ask", adminask)

	app.get("*", (req, res) => {
		renderError(res, 404, "The file you requested could not be found.")
	})
}

function notAdmin(req, res) {
	if (process.env.NODE_ENV == "production") {
		if (notLoggedIn(req)) {
			res.redirect("/login")
			return true
		}
		if (req.session.user.id !== process.env.owner) {
			renderError(res, 403)
			return true
		}
	}
	return false
}

function notAlive(res, act) {
	if (!botAlive && act) {
		renderError(res, 503, "Currently unavailable")
	}
	return !botAlive
}

function notLoggedIn(req) {
	return !(req.session.user && req.session.token)
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
	if (process.env.webhook_id && process.env.NODE_ENV == "production") {
		webhook.send(msg)
	}
}

function renderError(res, code, more) {
	res.status(code)
		.render("error", {code: code, more: more, desc: http.STATUS_CODES[code]})
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

async function adminask(req, res) {
	if (notAdmin(req, res)) return
	var command = null
	switch (req.params.ask) {
		case "pull":
			if (process.env.NODE_ENV !== "production") {
				res.status(401).send("Not production")
				return
			}
			command = "pull.cmd"
			break
		case "status":
			command = "git status"
			break
		case "stop":
			await res.status(204).end()
			process.exit()
		case "reload":
			await res.status(204).end()
			setTimeout(() => {
				process.on("exit", () => {
					child_process.spawn(process.argv.shift(), process.argv, {
						cwd: process.cwd(),
						detached: true,
						stdio: "inherit"
					})
				})
				process.exit()
			}, 100)
		default:
			return res.sendStatus(404)
	}
	child_process.exec(command, (err, std) => {
		if (err) {
			res.status(500).send(err)
		} else {
			res.send(std)
		}
	})
}
async function admin(req, res) {
	if (notAdmin(req, res)) return

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

	data.memory = Math.floor(100-os.freemem()/os.totalmem()*100) + "%"

	data.dashboard = process.uptime()*1000
	data.system = os.uptime()*1000

	if (req.query.data) {
		res.json(data)
		return
	}

	res.render("admin", {user: req.session.user, data: data, logs: logs})
}

function dashDemo(req, res) {
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
	res.render("dashboard", {user: {username: "pogo"}, guild: data})
}

async function dashboard(req, res) {
	if (notAlive(res, true)) return
	if (notLoggedIn(req)) return res.redirect("/login")

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
			res.render("dashboard", {user: req.session.user, guild: data})
		} catch (e) {
			console.error(e)
			renderError(res, 500)
		}
	} else {
		res.redirect("/guilds")
	}
}

async function dashSave(req, res) {
	if (notAlive(res)) return res.status(503).send("")

	var found = false
	if (req.params.id != "demo") {
		if (notLoggedIn(req)) return res.status(401).send("You aren't logged in!")

		for (const guild of req.session.guilds) {
			if (guild.id == req.params.id) {
				found = guild.id
			}
		}

		if (!found) return res.status(403).send("You dont have access to that guild")
	}

	const type = req.params.what

	if (!(type in SAVE_REQUIRED))
		return res.status(400).send("")

	for (const value of SAVE_REQUIRED[type]) {
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
		await botTalk.ask("save", {data: req.body, type: type, id: found, user: req.session.user.id})
		res.status(204).send("")
	} catch (e) {
		if (e == 403) {
			res.sendStatus(e)
		} else {
			console.error(e)
			res.status(500).send("")
		}
	}
}

async function login(req, res) {
	if (notAlive(res, true)) return
	if (!req.query.code) return res.redirect(oauth.generateAuthUrl({scope: process.env.scopes}))

	oauth.tokenRequest({scope: process.env.scopes, code: req.query.code, grantType: "authorization_code"})
	.catch(e => {
		res.redirect("/")
	}).then(async token => {
		await loadUser(req, token)
		res.redirect("/guilds")
	})
}

async function loadUser(req, token) {
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
		return renderError(res, 500)
	}

	req.session.guildsLoadedAt = new Date()
	req.session.token = token
	req.session.user = user
}

async function reload(req, res) {
	if (notAlive(res, true)) return
	if (notLoggedIn(req)) return res.redirect("/login")

	await loadUser(req, req.session.token)
	res.redirect("/guilds")
}