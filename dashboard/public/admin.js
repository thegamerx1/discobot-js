const page1 = $("#tabby")
const tabby = new Tabby(page1[0], $(".sidebar-menu")[0])
tabby.switch("manage")
uptimes.now = performance.now()
uptimes.bot = parseFloat(uptimes.bot)
uptimes.dashboard = parseFloat(uptimes.dashboard)
uptimes.system = parseFloat(uptimes.system)

refresh()
setInterval(refresh, 1000)

function prettyTime(time, diff) {
	return humanizeDuration(time + diff, {round: true})
}

function refresh() {
	const diff = performance.now() - uptimes.now
	page1.find("[name=bot]").val(prettyTime(uptimes.bot, diff))
	page1.find("[name=dashboard]").val(prettyTime(uptimes.dashboard, diff))
	page1.find("[name=system]").val(prettyTime(uptimes.system, diff))
}

function askDash(btn, action) {
	btn = $("btn")
	btn.prop("disabled", true)
	$.post("/admin/" + action, () => {
		btn.prop("disabled", false)
	}).fail(e => {
		halfmoon.initStickyAlert({
			content: `${e.status}: ${e.responseText || e.statusText}`,
			title: "Error",
			alertType: "alert-danger"
		})
		btn.prop("disabled", false)
	})
}