const plugin = require("../plugin")


class extension extends plugin.Base {
	meta = {
		name: "test",
		command: "test",
		cooldown: 3,
		owner: true
	}
    async execute(message) {
		const check = await this.bot.getEmoji("check")
		message.channel.send(check.toString())
		message.react(check)
    }
}

module.exports = extension