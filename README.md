# The Graph - Example Repositories

This repository contains links to example code for products built on The Graph. Each folder under this directory represents a separate example or demo showcasing various features and use-cases.

For more information, visit [www.thegraph.com/docs](https://www.thegraph.com/docs)

## Contents

-   **agent/**

    -   [**the-graph-agent-scaffold-eth/**](./agent/the-graph-agent-scaffold-eth/): "A starter kit that supports building an AI agent using Scaffold-ETH, NextJS, Hardhat, Vercel AI SDK, Subgraph MCP, The Graph Token API and Subgraph querying via GraphQL"

-   **subgraphs/**

    -   **basic-examples/**
        -   [**init-subgraph**](./subgraphs/basic-examples/init-subgraph): "Hello world" starter generated via `graph init`; ideal for first-time users wanting to see the file layout and deploy something fast. (last updated June 2025)
        -   [**arweave-blocks-transactions**](./subgraphs/basic-examples/arweave-blocks-transactions): Indexes Arweave blocks, transactions, tags and proofs-of-access; includes sample GraphQL queries for time-bounded block ranges. (last updated June 2022)
        -   [**near-blocks-example**](./subgraphs/basic-examples/near/blocks-example): Simplest NEAR template indexing the chain's blocks to illustrate NEAR manifest syntax and block handlers. (last updated April 2025)
        -   [**near-receipts-example**](./subgraphs/basic-examples/near/receipts-example): Indexes receipts from `app.good-morning.near`, showing how to build NEAR receipt-based entities. (last updated April 2025)
        -   [**cosmos-block-filtering**](./subgraphs/basic-examples/cosmos/block-filtering): Cosmos Hub-compatible subgraph that captures every block header; scripts let you regenerate manifests for any Cosmos-SDK chain. (last updated April 2025)
        -   [**cosmos-validator-rewards**](./subgraphs/basic-examples/cosmos/validator-rewards): Tracks validator reward events on Cosmos chains, building per-validator reward histories. (last updated April 2025)
        -   [**cosmos-validator-delegations**](./subgraphs/basic-examples/cosmos/validator-delegations): Captures delegation messages, mapping delegator → validator and amounts—good reference for message decoding in Cosmos. (last updated March 2023)
        -   [**cosmos-osmosis-token-swaps**](./subgraphs/basic-examples/cosmos/osmosis-token-swaps): Watches GAMM swap events on Osmosis to build a history of token swaps for any account. (last updated March 2023)
        -   [**query-examples**](./subgraphs/basic-examples/query-examples): Cookbook showing how to query The Graph from many frameworks (React, Next.js, Vue, Svelte, Python, Go, CLI, etc.) using an API key and best-practice query patterns. (last updated May 2025)
        -   [**ethereum-basic-event-handlers**](./subgraphs/basic-examples/ethereum-basic-event-handlers): Template illustrating custom event handler patterns for Ethereum contracts. (last updated June 2025)
    -   **subgraph-features/**
        -   [**blocks**](./subgraphs/features/blocks): Cross-network template that indexes block metadata (number, timestamp, etc.), letting you query blocks by number or time on any supported chain. (last updated April 2024)
        -   [**composable-subgraph**](./subgraphs/features/composable-subgraph): Minimal demo of The Graph's subgraph composition feature where a composed subgraph consumes entities from three smaller block subgraphs for modular, reusable data pipelines. (last updated March 2025)
        -   [**timeseries-and-aggregations-1**](./subgraphs/features/timeseries-and-aggregations-1): Lightweight sandbox that focuses purely on the mechanics of custom timeseries aggregations using predictable block numbers—perfect for learning aggregation syntax. (last updated Feb 2025)
        -   [**timeseries-and-aggregations-2**](./subgraphs/features/timeseries-and-aggregations-2): Example demonstrating timeseries and aggregations with The Graph, using CryptoPunks events (transfers, bids, sales) to showcase data aggregation over time. Includes a video walkthrough. (last updated Feb 2025)
        -   [**aggregations**](./subgraphs/features/aggregations): Demonstrates custom timeseries aggregations using predictable block numbers; schema, manifest, and mappings are heavily commented to teach aggregation patterns. (last updated April 2025)
        -   [**matic-lens-protocol-posts-subgraph**](./subgraphs/features/matic-lens-protocol-posts-subgraph): Indexes posts from Lens Protocol on the Polygon (Matic) network to illustrate social-graph data indexing and file data sources indexing from IPFS and Arweave. (last updated August 2024)
    -   **subgraph-full-stack-examples/**
        -   [**full-stack-dapp**](./subgraphs/full-stack-examples/full-stack-dapp): A workshop and template for full-stack dapp development using Scaffold-ETH 2 and The Graph. Covers environment setup, smart-contract deployment, subgraph creation, and frontend integration. Includes a video replay. (last updated Jan 2024)
        -   [**hackathon-react-apollo-app**](./subgraphs/full-stack-examples/hackathon-react-apollo-app): React + Apollo + Material-UI hackathon starter that shows how to wire a subgraph endpoint into a modern UI component stack. (last updated June 2025)
        -   [**eth-denver-dapp**](./subgraphs/full-stack-examples/eth-denver-dapp): Step-by-step workshop repo from ETHDenver that spins up Ganache, a local Graph Node, deploys an example subgraph and connects it to a React front-end. (last updated June 2025)
    -   **subgraph-examples-with-workshops/**
        -   [**subgraph-beginner-development-workshop**](./subgraphs/examples-with-workshops/subgraph-beginner-development): Hands-on workshop (video + slides) that walks through building a CryptoPunks starter subgraph, extending entities, and writing advanced queries—ideal for new subgraph devs. (last updated April 2025)
        -   [**file-data-sources**](./subgraphs/examples-with-workshops/file-data-sources): Workshop on using File Data Sources in subgraphs, including a fully functional example subgraph that implements File Data Sources and Full-Text Search, using the Beanz NFT collection as a case study. Includes slides. (last updated Feb 2024)
        -   [**query-the-graph**](./subgraphs/examples-with-workshops/query-the-graph): Workshop on querying subgraphs. Covers creating API keys, sending demo queries, and methods for querying using Vanilla JS, Python (Flask), graph-client, and React Apollo. Includes slides. (last updated May 2024)

-   **substreams/**
    - [**substreams-examples-monorepo**](https://github.com/streamingfast/substreams-example-monorepo): StreamingFast's monorepo for Substreams examples.
    - [**substreams-sink-examples**](https://github.com/streamingfast/substreams-sink-examples): This repository contains several examples of production-ready sink applications to consume Substreams package.

-   **token-api/**
    -   [**token-api-quickstart**](./token-api/token-api-quickstart): Provides examples for integrating The Graph's Token API directly via React and through Cursor MCP. Covers token balances, transfers, and multi-chain support. (last updated May 2025)
    -   [**token-api-scaffold-eth**](./token-api/token-api-scaffold-eth): Demonstrates integrating The Graph's Token API with Scaffold ETH to accelerate development of full-stack decentralized applications. (last updated May 2025)
    -   [**token-api-tax-demo**](./token-api/token-api-tax-demo): Shows how to pull wallet balances, historical inventory, transfers, and price data from The Graph Token API for tax and accounting, using a lightweight HTML, CSS, JavaScript, and Express proxy. (last updated May 2025)
    -   [**token-api-nft-components**](./token-api/token-api-nft-components/) Five copy/paste components that feature Token API's NFT features. (Last updated June 2025)

## License

This repository is licensed under the MIT License.
