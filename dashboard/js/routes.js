const botTalk = require("./botTalk")
const DiscordOauth2 = require("discord-oauth2")
const Discord = require("discord.js")
const http = require("http")
botTalk.init(21901, "localhost")

var lastCommands = []

const oauth = new DiscordOauth2({
	clientId: process.env.client_id,
    clientSecret: process.env.client_secret,
    redirectUri: process.env.redirect_uri
})

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

class routes {
	notfound(req, res) {
		renderError(res, 404, "The file you requested could not be found.")
	}
	index(req, res) {
		res.render("index", {user: req.session.user, title: "Home"})
	}

	dashboard(req, res) {
		if (notLoggedIn(req))
			return res.redirect("/login")

		res.render("dashboard", {
			user: req.session.user,
			title: "Dashboard",
			guilds: req.session.guilds
		})
	}


	dashDemo(req, res) {
		const data = {
			channels: [
				{name: "DemoJoins", id: 111},
				{name: "DemoEdits", id: 222}
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
		const {enabled, disabled} = parseCommands(data.commands, data.data.disabled_commands)
		data.data.enabled_commands = enabled
		data.data.disabled_commands = disabled
		res.render("dashconf", {user: {username: "pogo"}, title: "Dashboard", guild: data, sidebar: true})
	}

	async dashConfig(req, res) {
		if (notLoggedIn(req)) {
			res.redirect("/login")
			return
		}
		var found = false
		for (const guild of req.session.guilds) {
			if (guild.id == req.params.id) {
				found = guild.id
			}
		}
		if (found) {
			try {
				const data = await botTalk.ask("guild", {id: found})
				console.log(data)
				const {enabled, disabled} = parseCommands(data.commands, data.data.disabled_commands)
				data.data.enabled_commands = enabled
				data.data.disabled_commands = disabled
				lastCommands = data.commands
				res.render("dashconf", {user: req.session.user, title: "Dashboard", guild: data, sidebar: true})
			} catch (e) {
				console.error(e)
				renderError(res, 500)
				return
			}
		} else {
			res.redirect("/")
		}
	}

	async dashSave(req, res) {
		const required = {
			logging: ["edits", "deletes", "joins"],
			commands: ["disabled_commands"]
		}
		if (notLoggedIn(req)) {
			res.status(401).send("")
			return
		}
		var found = false
		for (const guild of req.session.guilds) {
			if (guild.id == req.params.id) {
				found = guild.id
			}
		}
		const type = req.params.what

		if (!found)
			return res.status(403).send("You dont have access to that guild")

		if (!(type in required))
			return res.status(400).send("")

		for (const value of required[type]) {
			if (!req.body[value])
				return res.status(400).send("")
		}

		var valid = true
		if (type == "commands") {
			req.body.disabled_commands.forEach(disabled => {
				if (!lastCommands.includes(disabled)) valid = false
			})
		}
		if (!valid) return res.status(400).send("Invalid commands sent")

		try {
			await botTalk.ask("save", {data: req.body, type: type, id: found})
			res.status(204).send("")
		} catch (e) {
			console.error(e)
			res.status(500).send("")
		}
	}

	async login(req, res) {
		try {
			await botTalk.ask("alive")
		} catch {
			return renderError(res, 503, "Login is currently unavailable")
		}

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
				renderError(res, 500, "Dashboard couldn't connect to the bot")
				return
			}

			req.session.user = user
			res.redirect("/dashboard")
		})
	}

	async logout(req, res) {
		await req.session.destroy()
		res.redirect("/")
	}

	async reload(req, res) {
		await req.session.destroy()
		res.redirect("/login")
	}
}
module.exports = new routes