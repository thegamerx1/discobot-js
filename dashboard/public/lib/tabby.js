class Tabby {
	constructor(tabs,btns) {
		this.tabs = tabs
		this.btns = btns

		this.btns.querySelectorAll(".tabby").forEach(e => {
			let name = e.getAttribute("name")
			e.addEventListener("click", this.switch.bind(this, name))
		})
	}

	enable(name) {
		this.tabs.classList.remove("d-none")
		let hash = window.location.hash.substr(1)
		if (hash) var el = this.tabs.querySelector(".tabby#" + hash)
		this.switch(el ? hash : name)
	}

	switch(name) {
		if (name instanceof HTMLElement) name = name.getAttribute(name)
		if (this.current == name) return
		this.current = name

		if (this.before && this.before()) return

		window.history.pushState({}, "", "#" + name)
		this.tabs.querySelectorAll(".tabby").forEach(e => {
			if (e.getAttribute("id") == name) {
				e.style.display = null
				if (this.after) this.after(e)
			} else {
				e.style.display = "none"
			}
		})

		this.btns.querySelectorAll(".tabby").forEach(e => {
			if (e.getAttribute("name") == name) {
				e.classList.add("active")
			} else {
				e.classList.remove("active")
			}
		})

	}
}