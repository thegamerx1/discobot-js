const Discord = require("discord.js")
const fs = require("fs")
const utils = require("utils")._
const colors = require("colors")
const { default: ow } = require("ow")

const ARG_WRAPS = [
	["<", ">"],
	["[", "]"],
]
const DEFAULT_GUILD = { prefix: "?" }
const DEFAULT_USER = {}

const CODEBLOCK_REGEX = /^(`{1,2}(?!`)(?<code>.*?))`{1,2}|`{3}((?=\w+\n)(?<lang>\w+)\n)(?<block>.*?)`{3}$/s

class bot_utils {
	constructor(client) {
		this.client = client
	}

	codeBlock(lang, code, sanitize, nothing) {
		nothing = nothing ?? "No output"
		code = code ?? ""
		if (sanitize ?? true) {
			code = code.replace("`", String.fromCharCode(8203) + "`")
		}
		if (code.match(/^\s$/m)) return nothing

		return `\`\`\`${lang}\n${code ?? nothing}\`\`\``
	}

	getCodeblock(code) {
		let out = {}
		const match = code.match(CODEBLOCK_REGEX)
		if (match) {
			out.code = match.groups.code ?? match.groups.block
			out.lang = match.groups.lang
		} else {
			out.code = code
		}
		return out
	}

	async getEmoji(name) {
		const emojis = (await this.client.guilds.fetch(process.env.guild)).emojis
		return emojis.cache.find(emoji => emoji.name == name)
	}
}

class Bot {
	constructor() {
		this.loadJSON()
		this.plugins = {}
		this.settings = {}
		this.client = new Discord.Client()
		this.client.on("disconnect", () => {
			console.error("I disconnec send help", arguments)
		})
		this.client.on("ready", () => {
			this.client.on("guildCreate", guild => console.log("Joined" + guild.name))
			this.client.on("message", this.onMessage.bind(this))
			console.log("Ready!".yellow)
		})
		this.client.login(process.env.token)
		this.utils = new bot_utils(this.client)
		setInterval(this.save.bind(this), 15 * 60 * 1000)
	}

	save() {
		console.log("Saving data")
		fs.writeFileSync("./json/data.json", JSON.stringify(this.data), "utf-8")
		fs.writeFileSync("./json/global.json", JSON.stringify(this.settings), "utf-8")
	}

	loadJSON() {
		this.data = JSON.parse(fs.readFileSync("./json/data.json", "utf-8"))
		this.global = JSON.parse(fs.readFileSync("./json/global.json", "utf-8"))
		Object.keys(this.data.guild).forEach(guild => {
			this.data.guild[guild] = Object.assign(DEFAULT_GUILD, this.data.guild[guild])
		})
		Object.keys(this.data.user).forEach(user => {
			this.data.user[user] = Object.assign(DEFAULT_USER, this.data.user[user])
		})
	}

	async onMessage(msg) {
		if (msg.author.bot) return

		msg.data = {
			user: this.getUser(msg.author),
			guild: this.getGuild(msg.guild),
		}

		let params = msg.content.match(/[^ ""']+|"([^""]+)"/g)
		if (!params) return
		let output = this.getCommand(params[0], msg.data.guild.prefix)
		if (output == null) return

		const { plugin, meta } = output

		if (params) {
			params.splice(0, 1)
			const length = meta.args?.length ?? 1
			if (params.length > length) params[length - 1] = params.splice(length - 1).join(" ")
			params.size = length
		}

		let missing = msg.guild.me.permissionsIn(msg.channel).missing(meta.botPerms)
		if (missing.includes("SEND_MESSAGES")) return
		if (missing.includes("EMBED_LINKS")) {
			msg.channel.send("I need `embed links` permission")
			return
		}
		if (missing.length > 0) {
			let out = ""
			missing.forEach(miss => {
				out += String.fromCharCode(8226) + " " + miss.replace("_", " ").toLowerCase() + "\n"
			})
			let embed = new Discord.MessageEmbed()
				.addField("I need the following permissions for that:", out)
				.setColor("RED")
			msg.channel.send(embed)
			return
		}

		if (meta.args) {
			for (const [i, arg] of meta.args.entries()) {
				try {
					if (arg.ow) arg.ow(params[i])
				} catch (e) {
					let usage = meta.command
					meta.args.forEach(arg => {
						usage += " " + this.wrapArg(arg.name, arg.optional)
					})
					const embed = new Discord.MessageEmbed()
						.setColor("A1363D")
						.setDescription(
							`**${e.message.replace(
								"argument",
								"*" + this.wrapArg(arg.name, arg.optional) + "*"
							)}**`
						)
						.addField("Usage", "`" + usage + "`", true)
					msg.channel.send(embed)
					return
				}
			}
			params.forEach((arg, i) => {
				const match = arg.match(/^\"?(.*?)\"?$/)
				params[i] = match ? match[1] : params[i]
			})
		}

		plugin._check(msg, params)
	}

	wrapArg(arg, optional) {
		const wrap = ARG_WRAPS[optional ?? 0]
		return wrap[0] + arg + wrap[1]
	}

	getCommand(name, prefix) {
		if (!name.startsWith(prefix)) return
		name = name.slice(prefix.length)

		for (const plug in this.plugins) {
			const { plugin } = this.plugins[plug]
			const meta = plugin.meta
			let possible = [meta.command].concat(meta.aliases)

			if (possible.includes(name.toLowerCase())) {
				return { plugin, meta }
			}
		}
	}

	getGuild(guild) {
		if (!this.data.guild[guild.id]) {
			this.data.guild[guild.id] = DEFAULT_GUILD
		}
		return this.data.guild[guild.id]
	}

	getUser(user) {
		if (!this.data.user[user.id]) {
			this.data.user[user.id] = DEFAULT_USER
		}
		return this.data.user[user.id]
	}

	addPlugin(creator, start) {
		const plugin = new creator(this.client, this)
		const meta = plugin.meta
		if (typeof meta.name == "object") this.removePlugin(meta.name)

		this.plugins[meta.name] = {
			plugin: plugin,
			events: [],
		}

		const { events } = this.plugins[meta.name]
		if (meta.events) {
			meta.events.forEach(event => {
				const func = plugin["on" + utils.pascalcase(event)].bind(plugin)
				events.push({ name: event, fn: func })
				this.client.on(event, func)
			})
		}

		if (start) plugin.init()

		if (meta.args) {
			meta.args.forEach((arg, i) => {
				meta.args[i].ow = ow.create(arg.ow)
			})
		}
	}

	reloadPlugins() {
		delete require.cache[require.resolve("./plugins")]
		let plugins = require("./plugins")
		let errored = []
		for (const name in plugins) {
			const extension = plugins[name]
			try {
				this.addPlugin(extension, false)
			} catch (e) {
				console.error(`Error loading ${name}`, e)
				errored.push(name)
			}
		}
		for (const plug in this.plugins) {
			const { plugin } = this.plugins[plug]
			plugin.init()
		}
		if (errored.length === 0) console.log(colors.green("(Re)loaded plugins successfully"))
		return errored
	}

	removePlugin(name) {
		if (typeof this.plugins[name] != "object") throw new Error(`Plugin ${name} is not loaded`)

		const { plugin, events } = this.plugins[name]

		events.forEach(event => {
			this.client.removeListener(event.name, event.fn)
		})

		if (plugin.disable) plugin.disable()

		delete this.plugins[name]
	}
}

// class CooldownManager {
// 	constructor()
// }
module.exports = Bot
