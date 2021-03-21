const Discord = require("discord.js")
const colors = require("colors")
const crypto = require("crypto")

class Base {
	constructor(client, bot) {
		this.client = client
		this.bot = bot
		this.utils = bot.utils
	}

	init() {
		if (!this.meta.botPerms) this.meta.botPerms = []
		this.meta.botPerms.push("SEND_MESSAGES", "ADD_REACTIONS", "EMBED_LINKS")
		if (this.start) this.start()
	}

	async _check(msg, args) {
		if (this.meta.owner && msg.author.id !== process.env.owner) {
			const embed = new Discord.MessageEmbed()
				.setColor("A1363D")
				.setDescription((await this.utils.getEmoji("no")).toString() + " You are not allowed to do that!")
			msg.channel.send(embed)
			return
		}

		try {
			console.debug(colors.gray(msg.author.tag + " ran " + this.meta.name))
			await this.execute(msg, args)
		} catch (e) {
			console.error(`Error at plugin ${this.meta.name}:`, e)
			let embed = new Discord.MessageEmbed()
				.setColor("RED")
			if (e instanceof Exception) {
				embed.description = (await this.utils.getEmoji("no")).toString() + " " + e.message
			} else {
				const id = crypto.createHash("sha256").update(msg.createdTimestamp.toString(), "binary").digest("hex")
				embed.setTitle("Oops!")
				embed.description = `
					An error ocurred on the command and my developer has been notified.\n\n
					You can join the support server [here](${process.env.invite})`
				embed.setFooter(`Error id: ${id}`)
			}
			msg.channel.send(embed)
		}
	}

	exception(...params) {
		throw new Exception(...params)
	}
}

class Exception extends Error {
	constructor(...params) {
		super(...params)
	}
}

module.exports = {Base, Exception}