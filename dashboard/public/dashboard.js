const dashboard = $("#dashboard")
const changes = $("#changes")
var changesDone = false
var disabledCommands = []
var currentSerialized = null

const tabby = new Tabby(dashboard[0], $(".sidebar-menu")[0])
tabby.before = () => changesDone
tabby.after = (e) => {
	e = $(e)
	currentForm = e
	if (e.attr("id") == "commands") {
		globalThis.currentSerialized = serializeCommands()
	} else {
		globalThis.currentSerialized = e.serialize()
	}
}

dashboard.find(".channelSelector").each((i ,e) => {
	CHANNELS.forEach(channel => {
		e.append(new Option("#" + channel.name, channel.id))
	})
})

Object.entries(FORM).forEach(([name, data]) => {
	const form = $(document.forms[name])
	Object.entries(data).forEach(([key, value]) => {
		const elem = form.find("[name=\"" + key +"\"]")
		elem.val(value)
		if (elem.val() == null) elem.val("0")
	})
})

dashboard.find("input, select").each((i, e) => {
	$(e).on("change", verifyChanges)
})

new Sortable($("#commands [name=disabled]")[0], {
	group: "shared",
    animation: 50,
	onRemove: verifyChanges,
	onAdd: verifyChanges
})

new Sortable($("#commands [name=enabled]")[0], {
	group: "shared",
    animation: 50
})

tabby.switch("logging")
dashboard.find("form").submit(false)
verifyChanges()
dashboard.removeClass("d-none")

function Submit() {
	changes.addClass("loadd")
	changes.find("i").removeClass("d-none")
	dashboard.addClass("loadd")
	setProgress(5)
	var out = undefined
	var serialized = undefined
	if (currentForm.attr("id") == "commands") {
		serialized = serializeCommands()
		out = {disabled_commands: serialized}
	} else {
		serialized = currentForm.serialize()
		out = serialized
	}

	console.debug(out)

	$.post(`/save/${currentForm.attr("id")}/${ID}`, out, () => {
		currentSerialized = serialized
		verifyChanges()
		fix()
	}).fail((e)=>{
		halfmoon.initStickyAlert({
			content: `${e.status}: ${e.responseText || e.statusText}`,
			title: "Error saving",
			alertType: "alert-danger"
		})
		setTimeout(fix, 500)
	})
	setProgress(80)
}

function fix() {
	setProgress(100)
	changes.removeClass("loadd")
	dashboard.removeClass("loadd")
	changes.find("i").addClass("d-none")
}


function serializeCommands() {
	let data = []
	for (const disabled of $("#commands [name=disabled]")[0].children) {
		data.push(disabled.textContent)
	}
	return data.sort()
}

function verifyChanges() {
	if (currentForm.attr("id") == "commands") {
		let serialized = serializeCommands()
		changesDone = (serialized.toString() !== currentSerialized.toString())
	} else {
		changesDone = (currentForm.serialize() !== currentSerialized)
	}
	if (changesDone) {
		changes.addClass("d-flex").show("200")
	} else {
		changes.removeClass("d-flex").hide()
	}
}