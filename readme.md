# Feather is a system for decentralized compute

The Feather Contract provides a mechanism to connect wasm executor nodes to
clients and stores code on the arweave blockchain.

Fidelity is guaranteed via randomly sampled redundancy, which is incentivized
via a staking mechanism.

The Feather token is used for staking

# Economics

Broadcasters put up a Proposed Contract with x AR.

Executors put up a Checking Contract with x FEA.

After 1000 blocks, 0.9x AR transferred to executor and 1.1x FEA transferred to
executor. Contract turned into Checked Contract.

If Angler agrees during checking contract phase, they can sign the contract,
and must stake same amount as $CURRENTPOT.

When contract turned into Checked Contract, Angler gets back 1.1x times their
stake.

If Angler disputes during checking contract phase, another checking contract
spawned with `$CURRENTPOT` FEA, and BOTH CLOCKS RESET.

At the end of 1000 blocks, the contract with larger pot is accepted and turned
into checked contract. the other contract is voided, and all the FEA in it is
nullified.
