require("dotenv").config()
const DiscordBot = require("./bot")

var Bot = new DiscordBot()

function exitHandler(options, exitCode) {
    if (exitCode != undefined) {
        Bot.save()
        if (typeof exitCode == "object")
            console.error(exitCode)
    }
    if (options.exit) process.exit(exitCode)
}

process.on("exit", exitHandler.bind(null,{cleanup:true}))
process.on("SIGINT", exitHandler.bind(null, {exit:true}))
process.on("SIGUSR1", exitHandler.bind(null, {exit:true}))
process.on("SIGUSR2", exitHandler.bind(null, {exit:true}))
process.on("uncaughtException", exitHandler.bind(null, {exit:true}))

Bot.reloadPlugins()