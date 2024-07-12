const statuses = {
	0: {
		icon: "assets/0.svg",
		status: "status-0",
		title: "All services are down",
		text: "Downtime",
	},
	1: {
		icon: "assets/1.svg",
		status: "status-1",
		title: "All services are online",
		text: "Operational",
	},
	2: {
		icon: "assets/2.svg",
		status: "status-2",
		title: "Some services are down",
		text: "Problem",
	},
	3: {
		icon: "assets/3.svg",
		status: "status-3",
		title: "Under Maintenance",
		text: "Maintenance",
	},
	load: {
		status: "status-2",
		title: "Loading Data...",
	},
}

document.addEventListener("alpine:init", () => {
	Alpine.store("gs", statuses["load"])
	Alpine.store("update", `Last updated on ${new Date().toLocaleString()}.`)
	Alpine.store("groups", [])
	Alpine.store("loader", true)
})

const monitorsUrl = kumaApiUrl + "/api/status-page/" + kumaPageName
const heartbeatUrl = kumaApiUrl + "/api/status-page/heartbeat/" + kumaPageName
const groups = []
let hasMaintenance

fetch(monitorsUrl)
	.then((res) => res.json())
	.then((json) => {
		hasMaintenance = json["maintenanceList"].length > 0

		json["publicGroupList"].forEach((group) => {
			const name = group["name"]
			const monitors = []
			group["monitorList"].forEach((monitor) => {
				monitors.push({
					id: monitor["id"],
					name: monitor["name"],
				})
			})
			groups.push({
				name: name,
				monitors: monitors,
			})
		})

		fetch(heartbeatUrl)
			.then((res) => res.json())
			.then((json) => {
				let activeServices = 0
				let services = 0

				groups.forEach((group) => {
					let monitorSuccess = 0
					group.monitors.forEach((monitor) => {
						monitor.heartbeats = []
						let success = 0

						json["heartbeatList"][monitor.id].forEach((beat) => {
							const status = statuses[beat.status]
							monitor.heartbeats.push({
								statusID: beat.status,
								status: status.status,
								ping: `Ping: ${Math.floor(beat.ping)}ms`,
								time: new Date(
									beat.time + " UTC"
								).toLocaleString(),
								icon: status.icon,
								header: status.text,
							})
							if (beat.status == 1) {
								success++
							}
						})

						const heartbeatsNum = monitor.heartbeats.length
						let statusNum =
							heartbeatsNum == 0
								? 3
								: monitor.heartbeats[heartbeatsNum - 1].statusID
						monitor.status = statuses[statusNum].status
						monitor.icon = statuses[statusNum].icon
						monitor.uptime = `<b>${
							heartbeatsNum == 0
								? 0.0
								: Math.floor(
										(success / heartbeatsNum) * 10000
								  ) / 100
						}</b>% uptime`

						if (statusNum === 1) {
							monitorSuccess++
							activeServices++
						}
						services++
					})

					group.stats = `${monitorSuccess} / ${group.monitors.length}`
				})

				if (hasMaintenance) {
					Alpine.store("gs", statuses[3])
				} else {
					if (activeServices == services) {
						Alpine.store("gs", statuses[1])
					} else if (activeServices == 0) {
						Alpine.store("gs", statuses[0])
					} else {
						Alpine.store("gs", statuses[2])
					}
				}

				Alpine.store("loader", false)
				Alpine.store("groups", groups)
			})
	})
	.catch(() => {
		Alpine.store("loader", false)
		Alpine.store("gs", statuses[0])
	})
