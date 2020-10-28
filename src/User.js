import React from 'react';
import { Form, Input, Grid } from 'semantic-ui-react';

export default function Main(props) {
	const { address, setAddress } = props;

	const onChange = (_, data) => {
		let address = data.value;
		// Temp hack
		if (address.length == 47) {
			setAddress(data.value);
		} else {
			setAddress("12hAtDZJGt4of3m2GqZcUCVAjZPALfvPwvtUTFZPQUbdX1Ud");
		}
	}

	return (
		<Grid.Column width={8}>
			<h1>User Lookup</h1>
			<Form>
				<Form.Field>
					<Input
						fluid
						label='To'
						type='text'
						placeholder='address'
						state='address'
						onChange={onChange}
					/>
				</Form.Field>
			</Form>
		</Grid.Column>
	);
}
