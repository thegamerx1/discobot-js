const Discord = require("discord.js")
const plugin = require("../plugin")
const format = require("string-format")

class extension extends plugin.Base {
	meta = {
		name: "about",
		command: "about",
		cooldown: 3,
		aliases: ["bot"]
	}
    async execute(msg) {
		const format = "*{}*: `{}`"
		const embed = new Discord.MessageEmbed()
			.setColor("BLURPLE")
			.addField("Bot", format.format("Uptime", process.uptime()))
			.addField("Gateway", Math.round(this.client.ws.ping) + "ms", true)

		msg.channel.send(embed)
    }
}

module.exports = extension