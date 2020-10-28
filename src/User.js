import React from 'react';
import { Form, Input, Grid } from 'semantic-ui-react';

export default function Main(props) {
	const { address, setAddress } = props;

	const onChange = (_, data) =>
		setAddress(data.value);

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
