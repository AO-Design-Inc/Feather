# Feather is a system for decentralized compute

The Feather Contract provides a mechanism to connect wasm executor nodes to
clients and stores code on the arweave blockchain.

To guarantee correct execution, a fisherman type architecture implemented atop
this contract, with angler nodes to check code execution is
***planned***. This will be incentivized via a staking mechanism.

# System

The contract in this repository enables users to propose executables for
running on the Feather network, these are then bid on by executors. Within x
blocks of inception, a bid must be accepted by the proposer, failing which the
proposed executable expires. 

When a bid is accepted, funds are moved into escrow from the proposer's wallet.
Then, the result is posted by the winning bidder, at which point the money is
moved into the winner's wallet. This entire process takes a minimum off at
least 20 minutes, which means that any practical application of feather would
require an optimistic broadcaster-executor system *(this is presently under
construction)*
