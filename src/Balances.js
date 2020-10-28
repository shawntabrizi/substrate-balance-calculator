import React, { useEffect, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { useSubstrate } from './substrate-lib';

export default function Main (props) {
  const { api } = useSubstrate();
  const { address } = props;
  const [account, setAccount] = useState({});


  useEffect(() => {
    let unsubscribeAll = null;
    // Reset when address changes
    setAccount({});

    api.query.system.account(address, account => {
        setAccount(account);
      }).then(unsub => {
        unsubscribeAll = unsub;
      }).catch(console.error);

    return () => unsubscribeAll && unsubscribeAll();
  }, [api, address]);

  return (
    <Grid.Column>
      <h1>Balances</h1>
      {JSON.stringify(account)}
    </Grid.Column>
  );
}
