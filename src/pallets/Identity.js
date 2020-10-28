import React, { useEffect, useState } from 'react';
import { Grid, Card } from 'semantic-ui-react';
import { useSubstrate } from '../substrate-lib';

function Main (props) {
const { api } = useSubstrate();
const { address } = props;

const [registration, setRegistration] = useState({});
const [deposit, setDeposit] = useState(0);
const [fees, setFees] = useState(0);

useEffect(() => {
	let unsubscribeAll = null;
	// Reset when address changes
	setRegistration({});

	api.query.identity.identityOf(address, registration => {
		setRegistration(registration.value);
		console.log(registration.value)
		setDeposit(registration.value.deposit);
		let fees = [];
		for (const judgement of registration.value.judgements) {
			console.log("judgement", judgement)
			if (judgement[1] && judgement[1].isFeePaid) {
				fees.push(judgement[1].asFeePaid)
			}
		}
		setFees(fees);
	}).then(unsub => {
		unsubscribeAll = unsub;
	}).catch(console.error);



	return () => unsubscribeAll && unsubscribeAll();
}, [api, address]);

return (
	<Grid.Column>
		<Card>
			<Card.Content>
				<Card.Header>Identity Pallet</Card.Header>
				<Card.Meta>
					<span>Balance Information</span>
				</Card.Meta>
				<Card.Description>
					<p>Deposit: {deposit.toString()}</p>
					<p>Fees: {fees.toString()}</p>
				</Card.Description>
			</Card.Content>
			<Card.Content extra>
				Total: {deposit + fees}
			</Card.Content>
		</Card>
	</Grid.Column>
);
}

export default function Identity(props) {
	const { api } = useSubstrate();
	return api && api.query.identity ? (
		<Main {...props} />
	) : null;
}
