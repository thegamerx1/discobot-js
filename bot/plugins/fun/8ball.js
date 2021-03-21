const plugin = require("../plugin")
const Discord = require("discord.js")
const utils = require("utils")._
const {default: ow} = require("ow")


class extension extends plugin.Base {
	meta = {
		name: "8ball",
		command: "8ball",
		cooldown: 3,
		args: [{name: "question", ow: ow.string}]
	}

    execute(message) {
		const replies = ["agrees", "doubts", "disagrees"]
		const BALL_RESPONSES = {
			"agrees": ["It is certain", "It is decidedly so", "Without a doubt", "Yes definitely", "You may rely on it",  "As I see it, yes", "Most likely", "Outlook good", "Yes",  "Signs point to yes"],
			"doubts": ["Reply hazy try again", "Ask again later", "Better not tell you now",  "Cannot predict now", "Concentrate and ask again"],
			"disagrees": ["Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"]
		}

		let embed = new Discord.MessageEmbed()
			.setDescription("Shaking..")
			.setColor("#383295")
		const choice = utils.pick()
		const choice2 = utils.pick(BALL_RESPONSES[choice])
		message.channel.send(embed).then((msg) => {
			setTimeout(() => {
				embed
					.setDescription("***:8ball: " + choice2 + "***")
					.setColor("#6E8BCF")
				msg.edit("**8 Ball " + choice + "**", embed)
			}, 3000)
		})
    }
}

module.exports = extension