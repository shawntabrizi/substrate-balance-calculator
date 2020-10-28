let output = document.getElementById("output");
let log = document.getElementById("log");
let address = document.getElementById("address");

// Global Variables
var global = {
	endpoint: '',
	chainDecimals: '',
	chainToken: 'Units',
};

// Convert a big number balance to expected float with correct units.
function toUnit(balance) {
	let decimals = global.chainDecimals;
	base = new BN(10).pow(new BN(decimals));
	dm = balance.divmod(base);
	return dm.div.toString() + "." + dm.mod.abs().toString() + global.chainToken
}

// Connect to Substrate endpoint
async function connect() {
	let endpoint = document.getElementById('endpoint').value;
	if (!window.substrate || global.endpoint != endpoint) {
		const provider = new api.WsProvider(endpoint);
		log.innerHTML = 'Connecting to Endpoint...';
		window.substrate = await api.ApiPromise.create({ provider });
		global.endpoint = endpoint;
		global.chainDecimals = substrate.registry.chainDecimals;
		global.chainToken = substrate.registry.chainToken;
		log.innerHTML = 'Connected';
	}
}

async function getDemocracyReserved() {
	if (!substrate.query.democracy) {
		console.log("No democracy pallet.");
		return new BN();
	}

	let deposit = new BN();
	// Get all DepositOf
	let deposits = await substrate.query.democracy.depositOf.entries();
	for (const [key, d] of deposits) {
		let users = d.value[0];
		let amount = d.value[1];
		// Find where the user matches
		for (user of users) {
			if (user.toString() == address.value) {
				// Add the deposit amount
				deposit = deposit.add(amount);
			}
		}
	}

	// Get Preimage Deposit
	let preimageDeposit = new BN();
	let preimages = await substrate.query.democracy.preimages.entries();
	for (let [key, preimage] of preimages) {
		preimage = preimage.value;
		if (preimage.isAvailable) {
			// TODO: Check if works
			preimage = preimage.asAvailable;
			if (preimage.provider.toString() == address.value) {
				preimageDeposit = preimageDeposit.add(preimage.deposit);
			}
		}
	}

	output.innerText += `Democracy: Deposit = ${deposit}, Preimage = ${preimageDeposit}\n`;
	return deposit.add(preimageDeposit);
}

async function getIdentityReserved() {
	if (!substrate.query.identity) {
		console.log("No identity pallet.");
		return new BN();
	}

	let registration = await substrate.query.identity.identityOf(address.value);
	registration = registration.value;

	// Deposit for existing identity
	let deposit = new BN();
	if (registration.deposit) {
		deposit = deposit.add(registration.deposit)
	}

	// Reserved fees for judgements
	let fees = new BN();
	if (registration.judgements) {
		for (const judgement of registration.judgements) {
			if (judgement.isFeePaid) {
				// TODO: Need to check this
				fees = fees.add(judgement.asFeePaid)
			}
		}
	}
	output.innerText += `Identity: Deposit = ${deposit}, Fees = ${fees}\n`;

	return deposit.add(fees)
}

async function getIndicesReserved() {
	if (!substrate.query.indices) {
		console.log("No indices pallet.");
		return new BN();
	}

	let deposit = new BN();
	// Each index has a user and a deposit amount
	let indices = await substrate.query.indices.accounts.entries();
	for (let [key, index] of indices) {
		index = index.value;
		let who = index[0];
		let amount = index[1];

		if (who.toString() == address.value) {
			deposit = deposit.add(amount);
		}
	}

	output.innerText += `Indices: Deposit = ${deposit}\n`;
	return deposit;
}

async function getMultisigReserved() {
	if (!substrate.query.multisig) {
		console.log("No multisig pallet.");
		return new BN();
	}

	let multisigDeposit = new BN();
	let multisigs = await substrate.query.multisig.multisigs.entries();
	for (let [key, multisig] of multisigs) {
		multisig = multisig.value;
		let who = multisig.depositor;
		let amount = multisig.deposit;

		if (who.toString() == address.value) {
			multisigDeposit = multisigDeposit.add(amount);
		}
	}

	let callsDeposit = new BN();
	let calls = await substrate.query.multisig.calls.entries();
	for (let [key, call] of calls) {
		call = call.value;
		let who = call[1];
		let amount = call[2];

		if (who.toString() == address.value) {
			callsDeposit = callsDeposit.add(amount);
		}
	}

	output.innerText += `Multisig: Deposit = ${multisigDeposit}, Calls = ${callsDeposit}\n`;
	return multisigDeposit.add(callsDeposit);
}

async function getProxyReserved() {
	if (!substrate.query.proxy) {
		console.log("No proxy pallet.");
		return new BN();
	}

	let proxyDeposit = new BN();
	let proxies = await substrate.query.proxy.proxies(address.value);
	let value = proxies[1];
	proxyDeposit = proxyDeposit.add(value)

	let announcementDeposit = new BN();
	let announcements = await substrate.query.proxy.announcements(address.value);
	let announcementValue = proxies[1];
	announcementDeposit = announcementDeposit.add(announcementValue)

	// TODO Anon vs delegator
	output.innerText += `Proxy: Deposit = ${proxyDeposit}, Announcement = ${announcementDeposit}\n`;
	return proxyDeposit.add(announcementDeposit);
}

async function getRecoveryReserved() {
	if (!substrate.query.recovery) {
		console.log("No recovery pallet.");
		return new BN();
	}

	// User has a recovery setup
	let recoverableDeposit = new BN();
	let recoverable = await substrate.query.recovery.recoverable(address.value);
	if (recoverable.isSome) {
		recoverable = recoverable.value;
		if (recoverable.deposit) {
			recoverableDeposit = recoverableDeposit.add(recoverable.deposit);
		}
	}

	// Active Recoveries
	let activeDeposit = new BN();
	let activeRecoveries = await substrate.query.recovery.activeRecoveries.entries();
	console.log(activeRecoveries);
	for (let [keys, active] of activeRecoveries) {
		// TODO: Confirm works
		let who = keys.args[1];
		let value = active.deposit;
		if (who.toString() == address.value) {
			activeDeposit = activeDeposit.add(value);
		}
	}

	output.innerText += `Recovery: Recoverable = ${recoverableDeposit}, Active: ${activeDeposit}\n`;
	return recoverableDeposit.add(activeDeposit);
}

async function getSocietyReserved() {
	if (!substrate.query.society) {
		console.log("No society pallet.");
		return new BN();
	}

	let bidDeposit = new BN();
	let bids = await substrate.query.society.bids();
	for (bid of bids) {
		if (bid.who.toString() == address.value) {
			if (bid.kind.isDeposit) {
				bidDeposit = bidDeposit.add(bid.kind.asDeposit);
			}
		}
	}

	output.innerText += `Society: Bid Deposit = ${bidDeposit}\n`;
	return bidDeposit;
}

async function getTreasuryReserved() {
	if (!substrate.query.treasury) {
		console.log("No treasury pallet.");
		return new BN();
	}

	let proposalDeposit = new BN();
	let proposals = await substrate.query.treasury.proposals.entries();
	for (let [key, proposal] of proposals) {
		proposal = proposal.value;
		let who = proposal.proposer;
		let value = proposal.bond;
		if (who.toString() == address.value) {
			proposalDeposit = proposalDeposit.add(value);
		}
	}

	let tipDeposit = new BN();
	let tips = await substrate.query.treasury.tips.entries();
	for (let [key, tip] of tips) {
		tip = tip.value;
		let who = tip.who;
		let value = tip.deposit;
		if (who.toString() == address.value) {
			tipDeposit = tipDeposit.add(value);
		}
	}

	let curatorDeposit = new BN();
	let bountyDeposit = new BN();
	let bounties = await substrate.query.treasury.bounties.entries();
	for (let [key, bounty] of bounties) {
		bounty = bounty.value;
		let status = bounty.status;
		// Bounty is not funded yet, so there is still a deposit for proposer.
		if (status.isProposed || status.isFunded) {
			let who = bounty.proposer;
			let value = bounty.bond;
			if (who.toString() == address.value) {
				bountyDeposit = bountyDeposit.add(value);
			}
		} else {
			// Curator has a deposit.
			let value = bounty.curatorDeposit;
			if (!value.isZero()) {
				let status = bounty.status;
				if (status.value && status.value.curator) {
					let who = status.value.curator;
					if (who.toString() == address.value) {
						curatorDeposit = curatorDeposit.add(value);
					}
				}
			}
		}
	}

	output.innerText += `Treasury: Proposal = ${proposalDeposit}, Tip = ${tipDeposit}, Bounty = ${bountyDeposit}, Curator = ${curatorDeposit}\n`;
	return proposalDeposit.add(tipDeposit).add(curatorDeposit);
}

async function getActualReserved() {
	let account = await substrate.derive.balances.all(address.value);
	return account.reservedBalance;
}

function clear() {
	output.innerText = "";
}

async function calculateReserved() {
	await connect();
	clear();
	let reserved = new BN();

	// Calculate the reserved balance pallet to pallet
	reserved = reserved.add(await getDemocracyReserved());
	reserved = reserved.add(await getIdentityReserved());
	reserved = reserved.add(await getIndicesReserved());
	reserved = reserved.add(await getMultisigReserved());
	reserved = reserved.add(await getProxyReserved());
	reserved = reserved.add(await getRecoveryReserved());
	reserved = reserved.add(await getSocietyReserved());
	reserved = reserved.add(await getTreasuryReserved());

	output.innerText += `Final: ${toUnit(reserved)}\n`;

	// Get the current reserved balance for account
	let actualReserved = await getActualReserved();
	output.innerText += `Actual: ${toUnit(actualReserved)}\n`;

	// Show difference between calculated and actual
	let diff = actualReserved.sub(reserved)
	output.innerText += `Difference: ${toUnit(diff)}\n`;
}
