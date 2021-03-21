const Discord = require("discord.js")
const plugin = require("../plugin")
const ColorScale = require("color-scales")


class extension extends plugin.Base {
	meta = {
		name: "ping",
		command: "ping",
		cooldown: 3,
		aliases: ["pong"]
	}
    async execute(message) {
        let msg = await message.channel.send("ping")
		const ping = msg.createdTimestamp - message.createdTimestamp
		let color = new ColorScale(100, 300, ["#00ff33", "#ff0000"]).getColor(ping)
		const embed = new Discord.MessageEmbed()
			.setColor(color.toHexString())
			.addField("Ping", ping + "ms", true)
			.addField("Gateway", Math.round(this.client.ws.ping) + "ms", true)

		msg.edit("pong", embed)
    }
}

module.exports = extension