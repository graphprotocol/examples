> **Last updated:** June 2025

# Subgraph Composition Example

Built by [Krishnanand VP](https://github.com/incrypto32)

Last updated April 2025

This repository provides a minimal example of how to use the new subgraph composition feature of [The Graph][0].

## What is The Graph?

[The Graph][0] is a powerful, decentralized protocol that enables seamless querying and indexing of blockchain data. 
It simplifies the complex process of querying blockchain data, making DApp development faster and easier.

## What is subgraph composition?

Subgraph composition allows a subgraph to depend on another subgraph as a data source, allowing one subgraph to consume 
and react to the data or entity changes of another subgraph. This feature enables modular subgraph architectures.

Instead of interacting directly with on-chain data, a subgraph can be set up to listen to updates from another subgraph 
and react to entity changes. This can be used for a variety of use cases, such as aggregating data from multiple 
subgraphs or triggering actions based on changes in external subgraph entities.

## How to use subgraph composition?

The example defines 3 source subgraphs:
- [block-time-subgraph](./block-time-subgraph) - a subgraph that calculates the block time for each block
- [block-cost-subgraph](./block-cost-subgraph) - a subgraph that indexes the cost of each block
- [block-size-subgraph](./block-size-subgraph) - a subgraph that indexes the size of each block

and a composed subgraph that combines and aggregates the information from the 3 source subgraphs:

- [block-stats-subgraph](./block-stats-subgraph) - a subgraph that collects statistics about blocks

[0]: https://thegraph.com/
