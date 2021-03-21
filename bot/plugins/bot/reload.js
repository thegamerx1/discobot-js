const plugin = require("../plugin")
const Discord = require("discord.js")
const util = require("util")

class extension extends plugin.Base {
	meta = {
		name: "reload",
		command: "reload",
		cooldown: 3,
		owner: true
	}

    execute(message) {
		const format = `${String.fromCharCode(8226)} %s\n`
        const errors = this.bot.reloadPlugins()
		let embed = new Discord.MessageEmbed()
		console.log(errors.length)
		if (errors.length > 0) {
			let out = ""
			errors.forEach(err => {
				out += util.format(format, err)
			})
			embed.description = "**The following modules failed:**\n" + out
			embed.setColor("#36A139")
		} else {
			embed.description = "Successfully reloaded!"
			embed.setColor("#36A139")
		}
		message.channel.send(embed)
    }
}

module.exports = extension