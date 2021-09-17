let output = document.getElementById("output");
let log = document.getElementById("log");
let address = document.getElementById("address");

// Global Variables
var global = {
	address: '',
	endpoint: '',
	chainDecimals: '',
	chainToken: 'Units',
};

// Convert a big number balance to expected float with correct units.
function toUnit(balance) {
	let decimals = global.chainDecimals;
	base = new BN(10).pow(new BN(decimals));
	dm = balance.divmod(base);
	return dm.div.toString() + "." + dm.mod.abs().toString() + " " + global.chainToken
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
		global.chainToken = substrate.registry.chainTokens[0];
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
			if (util.u8aEq(user, global.address)) {
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
			if (util.u8aEq(preimage.provider, global.address)) {
				preimageDeposit = preimageDeposit.add(preimage.deposit);
			}
		}
	}

	output.innerText += `Democracy: Deposit = ${toUnit(deposit)}, Preimage = ${toUnit(preimageDeposit)}\n`;
	return deposit.add(preimageDeposit);
}

/*
async function getElectionsReserved() {
	if (!substrate.query.electionsPhragmen) {
		console.log("No elections pallet.");
		return new BN();
	}

	let votingBond = (await substrate.query.electionsPhragmen.voting(global.address))[1].length > 0 ? substrate.consts.electionsPhragmen.votingBond : new BN();

	let is_member = (await substrate.query.electionsPhragmen.members()).find(([m, _]) => util.u8aEq(m, global.address)) != undefined;
	let is_runner_up = (await substrate.query.electionsPhragmen.runnersUp()).find(([m, _]) => util.u8aEq(m, global.address)) != undefined;
	let is_candidate = (await substrate.query.electionsPhragmen.candidates()).find((c) => util.u8aEq(c, global.address)) != undefined;
	let candidateBond = is_member || is_runner_up || is_candidate ? substrate.consts.electionsPhragmen.candidacyBond : new BN();

	output.innerText += `Elections: Voting = ${toUnit(votingBond)}, Candidate = ${toUnit(candidateBond)}\n`;

	return votingBond.add(candidateBond)
}
*/

async function getPhragmenElectionReserved() {
	if (!substrate.query.phragmenElection) {
		console.log("No phragmen elections pallet.");
		return new BN();
	}

	let voter = await substrate.query.phragmenElection.voting(global.address);

	let deposit = new BN();
	if (voter.deposit) {
		deposit = deposit.add(voter.deposit);
		console.log(deposit);
	}
	output.innerText += `Phragmen Elections: Deposit = ${toUnit(deposit)}\n`

	return deposit;
}

async function getIdentityReserved() {
	if (!substrate.query.identity) {
		console.log("No identity pallet.");
		return new BN();
	}

	let registration = await substrate.query.identity.identityOf(global.address);
	registration = registration.value;
	let subIdentities = await substrate.query.identity.subsOf(global.address);

	// Deposit for existing identity
	let deposit = new BN();
	// Deposit for any subidentities
	let subDeposit = new BN();
	if (registration.deposit) {
		deposit = deposit.add(registration.deposit);
		subDeposit = subDeposit.add(subIdentities[0]);
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
	output.innerText += `Identity: Deposit = ${toUnit(deposit)}, Sub-identities Deposit = ${toUnit(subDeposit)}, Fees = ${toUnit(fees)}\n`;

	return deposit.add(fees).add(subDeposit);
}

async function getRegistrarReserved() {
	if (!substrate.query.registrar) {
		console.log("No registrar pallet.");
		return new BN();
	}

	let deposit = new BN();
	let paras = await substrate.query.registrar.paras.entries();
	for (let [key, para] of paras) {
		para = para.value;
		let who = para.manager;
		let value = para.deposit;
		if (util.u8aEq(who, global.address)) {
			deposit = deposit.add(value);
		}
	}
	output.innerText += `Registrar: Deposit = ${toUnit(deposit)}\n`

	return deposit;
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

		if (util.u8aEq(who, global.address)) {
			deposit = deposit.add(amount);
		}
	}

	output.innerText += `Indices: Deposit = ${toUnit(deposit)}\n`;
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

		if (util.u8aEq(who, global.address)) {
			multisigDeposit = multisigDeposit.add(amount);
		}
	}

	let callsDeposit = new BN();
	let calls = await substrate.query.multisig.calls.entries();
	for (let [key, call] of calls) {
		call = call.value;
		let who = call[1];
		let amount = call[2];

		if (util.u8aEq(who, global.address)) {
			callsDeposit = callsDeposit.add(amount);
		}
	}

	output.innerText += `Multisig: Deposit = ${toUnit(multisigDeposit)}, Calls = ${toUnit(callsDeposit)}\n`;
	return multisigDeposit.add(callsDeposit);
}

async function getProxyReserved() {
	if (!substrate.query.proxy) {
		console.log("No proxy pallet.");
		return new BN();
	}

	let proxyDeposit = new BN();
	let proxies = await substrate.query.proxy.proxies(global.address);
	let value = proxies[1];
	proxyDeposit = proxyDeposit.add(value)

	let announcementDeposit = new BN();
	let announcements = await substrate.query.proxy.announcements(global.address);
	let announcementValue = proxies[1];
	announcementDeposit = announcementDeposit.add(announcementValue)

	// TODO Anon vs delegator
	output.innerText += `Proxy: Deposit = ${toUnit(proxyDeposit)}, Announcement = ${toUnit(announcementDeposit)}\n`;
	return proxyDeposit.add(announcementDeposit);
}

async function getRecoveryReserved() {
	if (!substrate.query.recovery) {
		console.log("No recovery pallet.");
		return new BN();
	}

	// User has a recovery setup
	let recoverableDeposit = new BN();
	let recoverable = await substrate.query.recovery.recoverable(global.address);
	if (recoverable.isSome) {
		recoverable = recoverable.value;
		if (recoverable.deposit) {
			recoverableDeposit = recoverableDeposit.add(recoverable.deposit);
		}
	}

	// Active Recoveries
	let activeDeposit = new BN();
	let activeRecoveries = await substrate.query.recovery.activeRecoveries.entries();
	for (let [keys, active] of activeRecoveries) {
		// TODO: Confirm works
		let who = keys.args[1];
		let value = active.deposit;
		if (util.u8aEq(who, global.address)) {
			activeDeposit = activeDeposit.add(value);
		}
	}

	output.innerText += `Recovery: Recoverable = ${toUnit(recoverableDeposit)}, Active: ${toUnit(activeDeposit)}\n`;
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
		if (util.u8aEq(bid.who, global.address)) {
			if (bid.kind.isDeposit) {
				bidDeposit = bidDeposit.add(bid.kind.asDeposit);
			}
		}
	}

	output.innerText += `Society: Bid Deposit = ${toUnit(bidDeposit)}\n`;
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
		if (util.u8aEq(who, global.address)) {
			proposalDeposit = proposalDeposit.add(value);
		}
	}

	let tipDeposit = new BN();
	let tips = await substrate.query.tips.tips.entries();
	for (let [key, tip] of tips) {
		tip = tip.value;
		let who = tip.who;
		let value = tip.deposit;
		if (util.u8aEq(who, global.address)) {
			tipDeposit = tipDeposit.add(value);
		}
	}

	let curatorDeposit = new BN();
	let bountyDeposit = new BN();
	let bounties = await substrate.query.bounties.bounties.entries();
	for (let [key, bounty] of bounties) {
		bounty = bounty.value;
		let status = bounty.status;
		// Bounty is not funded yet, so there is still a deposit for proposer.
		if (status.isProposed || status.isFunded) {
			let who = bounty.proposer;
			let value = bounty.bond;
			if (util.u8aEq(who, global.address)) {
				bountyDeposit = bountyDeposit.add(value);
			}
		} else {
			// Curator has a deposit.
			let value = bounty.curatorDeposit;
			if (!value.isZero()) {
				let status = bounty.status;
				if (status.value && status.value.curator) {
					let who = status.value.curator;
					if (util.u8aEq(who, global.address)) {
						curatorDeposit = curatorDeposit.add(value);
					}
				}
			}
		}
	}

	output.innerText += `Treasury: Proposal = ${toUnit(proposalDeposit)}, Tip = ${toUnit(tipDeposit)}, Bounty = ${toUnit(bountyDeposit)}, Curator = ${toUnit(curatorDeposit)}\n`;
	return proposalDeposit.add(tipDeposit).add(curatorDeposit);
}

async function getActualReserved() {
	let account = await substrate.derive.balances.all(global.address);
	return account.reservedBalance;
}

function clear() {
	output.innerText = "";
}

async function calculateReserved() {
	await connect();
	clear();
	let reserved = new BN();

	global.address = util_crypto.decodeAddress(address.value);

	// Calculate the reserved balance pallet to pallet
	reserved = reserved.add(await getDemocracyReserved());
	//reserved = reserved.add(await getElectionsReserved());
	reserved = reserved.add(await getPhragmenElectionReserved());
	reserved = reserved.add(await getIdentityReserved());
	reserved = reserved.add(await getRegistrarReserved());
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
