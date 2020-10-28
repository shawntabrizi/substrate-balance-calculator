let output = document.getElementById("output");
let log = document.getElementById("log");
let address = document.getElementById("address");

// Global Variables
var global = {
	endpoint: '',
	chainDecimals: '',
	chainToken: 'Units',
};

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

async function getIdentityReserved() {
	if (!substrate.query.identity) { console.log("No identity pallet.") }
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
			if(judgement.isFeePaid) {
				// TODO: Need to check this
				fees = fees.add(judgement.asFeePaid)
			}
		}
	}
	output.innerText += `Identity: Deposit = ${deposit}, Fees = ${fees}\n`;

	return deposit.add(fees)
}

async function getDemocracyReserved() {
	if (!substrate.query.democracy) { console.log("No democracy pallet.") }

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

async function getIndicesReserved() {
	if (!substrate.query.indices) { console.log("No indices pallet.") }

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

async function getProxyReserved() {
	// TODO Proxy
}

async function getRecoveryReserved() {
	if (!substrate.query.recovery) { console.log("No recovery pallet.") }

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

	// TODO: FIX
	let activeDeposit = new BN();
	// let activeRecoveries = await substrate.query.recovery.activeRecoveries.entries();
	// console.log(activeRecoveries);
	// for (let [key1, key2, active] of activeRecoveries) {
	// 	console.log(key1, key2, active);
	// }


	output.innerText += `Recovery: Recoverable = ${recoverableDeposit}, Active: ${activeDeposit}\n`;
	return recoverableDeposit.add(activeDeposit);
}

async function getSocietyReserved() {
	if (!substrate.query.society) { console.log("No society pallet.") }

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
	if (!substrate.query.treasury) { console.log("No society pallet.") }

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
		if (status.isProposed || status.isFunded) {
			let who = bounty.proposer;
			let value = bounty.bond;
			if (who.toString() == address.value) {
				bountyDeposit = bountyDeposit.add(value);
			}
		} else {
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
	//reserved = reserved.add(await getDemocracyReserved());
	reserved = reserved.add(await getIdentityReserved());
	//reserved = reserved.add(await getIndicesReserved());
	//reserved = reserved.add(await getMultisigReserved());
	//reserved = reserved.add(await getProxyReserved());
	//reserved = reserved.add(await getRecoveryReserved());
	//reserved = reserved.add(await getSocietyReserved());
	reserved = reserved.add(await getTreasuryReserved());

	output.innerText += `Final: ${reserved}\n`;

	// Get the current reserved balance for account
	let actualReserved = await getActualReserved();
	output.innerText += `Actual: ${actualReserved}\n`;

	// Show difference between calculated and actual
	let diff = actualReserved.sub(reserved)
	output.innerText += `Difference: ${diff}\n`;

}
