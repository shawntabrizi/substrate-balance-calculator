import React, { useEffect, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { useSubstrate } from './substrate-lib';

export default function Main (props) {
  const { api } = useSubstrate();
  const { address } = props;
  const [account, setAccount] = useState({});
  const [free, setFree] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [miscFrozen, setMiscFrozen] = useState(0);
  const [feeFrozen, setFeeFrozen] = useState(0);

  useEffect(() => {
    let unsubscribeAll = null;
    // Reset when address changes
    setAccount({});

    api.query.system.account(address, account => {
        setAccount(account);
        setFree(account.data.free.toHuman());
        setReserved(account.data.reserved.toHuman());
        setMiscFrozen(account.data.miscFrozen.toHuman());
        setFeeFrozen(account.data.feeFrozen.toHuman());
      }).then(unsub => {
        unsubscribeAll = unsub;
      }).catch(console.error);

    return () => unsubscribeAll && unsubscribeAll();
  }, [api, address]);

  return (
    <Grid.Column>
      <h1>Balances</h1>
      <Grid>
        <Grid.Column width={4}>
        <h2>Free</h2>
        {free}
        </Grid.Column>
        <Grid.Column width={4}>
        <h2>Reserved</h2>
        {reserved}
        </Grid.Column>
        <Grid.Column width={4}>
        <h2>Misc Frozen</h2>
        {miscFrozen}
        </Grid.Column>
        <Grid.Column width={4}>
        <h2>Fee Frozen</h2>
        {feeFrozen}
        </Grid.Column>
      </Grid>
    </Grid.Column>
  );
}
