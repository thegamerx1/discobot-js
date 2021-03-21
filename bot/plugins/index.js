const path = require("path")
const walk = require("@folder/readdir")

walk.sync("./plugins/", { nodir: true, recursive: true }).forEach(dir => {
    dir = __dirname + "/" + dir
    if (path.dirname(dir).split(path.sep).pop() == "plugins") return
    const name = path.basename(dir)
    const directory = require.resolve(dir)
    delete require.cache[directory]
    module.exports[name] = require(directory)
})