const plugin = require("../plugin")
const {default: ow} = require("ow")
const Discord = require("discord.js")
const http = require("got")
const FormData = require("form-data")


const RUN_API = "https://cloudahk.com/api/v1/language/ahk/run"

const PASTE_REGEX = /^(\w+:\/\/)?p\.ahkscript\.org\/\?\w\=(?<id>\w+)$/i
const PASTE_API = "https://p.ahkscript.org/?r="
const PASTE_POST = "https://p.ahkscript.org"

const LANGS = [
	{names: ["bash", "sh"], head: "bin/bash"},
	{names: ["py2"], head: "usr/bin/env python"},
	{names: ["py", "python"], head: "usr/bin/env python3"},
	{names: ["fish"], head: "usr/bin/env fish"},
	{names: ["node", "js"], head: "usr/bin/env node"},
	{names: ["perl"], head: "usr/bin/env perl"},
	{names: ["php"], head: "usr/bin/env php"}
]

class extension extends plugin.Base {
	meta = {
		name: "run",
		command: "run",
		cooldown: 3,
		args: [{name: "code", ow: ow.string.maxLength(800)}]
	}
	ready() {
		this.key = "Basic " + Buffer.from(process.env.cloudahk).toString("base64")
	}

    async execute(msg, args) {
		let code = this.utils.getCodeblock(args[0])

		code.lang = code.lang ?? "ahk"
		if (code.lang) {
			LANGS.forEach(lang => {
				lang.names.forEach(name => {
					if (name == code.lang) {
						code.code = "#!/" + lang.head + "\n" + code.code
					}
				})
			})
		}

		const match = code.code.match(PASTE_REGEX)
		if (match) {
			await http("GET", PASTE_API + match.id)
			.then(res => {
				code.code = res
			}).catch(err => {
				this.exception("Error getting code from paste")
			})
		}
		await this.gotCode(msg, code)
    }

	async gotCode(msg, code) {
		let data = {lang: code.lang}
		await http.post(RUN_API, {
			headers: {"Authorization": this.key},
			body: code.code,
			responseType: "json"
		}).then(async res => {
			data.code = res.body.stdout
			data.time = res.body.time
			data.lines = data.code.split(/\n/).length-1
			if (data.code.length > 10000 || data.lines > 13) {
				let form = new FormData()
				form.append("code", data.code)
				await http.post(PASTE_POST, {
					body: form,
					followRedirect: false
				}).then(res => {
					data.link = PASTE_POST + res.headers.location.slice(1)
				}).catch(err => {
					this.exception("Error posting long code")
				})
			}
			this.sendResponse(msg, data)
		})
	}

	sendResponse(msg, data) {
		const time = data.time ? data.time.toFixed(2) + "s" : "Timed out"
		const embed = new Discord.MessageEmbed()
			.setColor("GREEN")
			.addField("Time", time, true)
			.addField("Lang", data.lang, true)
			.addField("Lines", data.lines, true)
		msg.channel.send(data.link ?? this.utils.codeBlock(data.lang, data.code), embed)
	}
}

module.exports = extension