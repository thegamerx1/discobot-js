const page = $("#tabby")
const tabby = new Tabby(page[0], $(".sidebar-menu")[0])
tabby.after = (e) => {
	if (e.getAttribute("id") == "logs") {
		let scrolly = e.querySelector("pre")
		scrolly.scrollTop = scrolly.scrollHeight
	}
}

tabby.enable("manage")
data.now = performance.now()

refresh()
setInterval(refresh, 1000)
var requestInterval = setInterval(request, 10000)

function prettyTime(time, diff) {
	if (time == 0) return "Down"
	return humanizeDuration(time + diff, {round: true})
}

function refresh() {
	const diff = performance.now() - data.now
	page.find("[name=memory]").width(data.memory).html(data.memory)
	page.find("[name=bot]").val(prettyTime(data.bot, diff))
	page.find("[name=dashboard]").val(prettyTime(data.dashboard, diff))
	page.find("[name=system]").val(prettyTime(data.system, diff))
}

function request() {
	$.get("/admin?data=true", (res) => {
		data.now = performance.now()
		res = JSON.parse(res)
		data = Object.assign(data, res)
	}).fail(() => {
		clearInterval(requestInterval)
	})
}

// function askDash(btn, action) {
// 	btn = $("btn")
// 	btn.prop("disabled", true)
// 	$.post("/admin/" + action, () => {
// 		btn.prop("disabled", false)
// 	}).fail(e => {
// 		halfmoon.initStickyAlert({
// 			content: `${e.status}: ${e.responseText || e.statusText}`,
// 			title: "Error",
// 			alertType: "alert-danger"
// 		})
// 		btn.prop("disabled", false)
// 	})
// }