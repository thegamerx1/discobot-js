const plugin = require("../plugin")


class extension extends plugin.Base {
	meta = {
		name: "say",
		command: "say",
		cooldown: 3,
		owner: true
	}

    execute(message, args) {
		message.channel.send(args[0])
    }
}

module.exports = extension