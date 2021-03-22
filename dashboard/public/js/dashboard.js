const dashboard = $("#dashboard")
const changes = $("#changes")
var changesDone = false
var disabledCommands = []

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

dashboard.removeClass("d-none")
$(".sidebar-menu a")[0].click()
$("#dashboard form").submit(false)
verifyChanges()

function Submit(btn) {
	changes.addClass("loadd")
	changes.find("i").removeClass("d-none")
	dashboard.addClass("loadd")
	setProgress(5)
	var out = undefined
	var serialized = undefined
	if (currentForm.attr("id") == "commands") {
		var data  = []
		for (const disabled of $("#commands [name=disabled]")[0].children) {
			console.log(disabled)
			data.push(disabled.textContent)
		}

		serialized = data.sort()
		out = {disabled_commands: serialized}
	} else {
		serialized = currentForm.serialize()
		out = serialized
	}

	console.log(out)

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

function setTabby(e, to) {
	if (typeof currentForm != "undefined" && currentForm.serialize() != currentSerialized) {
		return
	}
	$("#dashboard form").each((i, e) => {
		e = $(e)
		if (changesDone) return

		if (e.attr("id") == to) {
			currentForm = e
			if (e.attr("id") == "commands") {
				currentSerialized = []
				for (const disabled of $("#commands [name=disabled]")[0].children) {
					currentSerialized.push(disabled.textContent)
				}
				currentSerialized = currentSerialized.sort()
			} else {
				currentSerialized = e.serialize()
			}
			e.show()
		} else {
			e.hide()
		}
	})

	for (const elem of e.parentElement.children) {
		elem.classList.remove("active")
	}

	e.classList.add("active")
}

function verifyChanges() {
	if (currentForm.attr("id") == "commands") {
		let serialized = []
		for (const disabled of $("#commands [name=disabled]")[0].children) {
			serialized.push(disabled.textContent)
		}
		changesDone = (serialized.sort().toString() !== currentSerialized.toString())
	} else {
		changesDone = (currentForm.serialize() !== currentSerialized)
	}
	if (changesDone) {
		changes.addClass("d-flex").show("200")
	} else {
		changes.removeClass("d-flex").hide()
	}
}