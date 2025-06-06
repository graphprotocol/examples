> **Last updated:** June 2025

# Basic Example Subgraph

This is a basic subgraph provided for reference purposes. It serves as a starting point for developers looking to understand how subgraphs work with The Graph.

## Key Files

This example is comprised of three core files that define the schema, the manifest, and the mapping logic.

### `schema.graphql`
Defines the `Gravatar` entity stored in The Graph's data store:

```graphql
type Gravatar @entity(immutable: false) {
  id: ID!                    # Unique identifier (uint256 → hex string)
  owner: Bytes!              # Address of the Gravatar owner
  displayName: String!       # Chosen display name
  imageUrl: String!          # URL of the avatar image
}
```

- `@entity(immutable: false)` allows updates to existing entities.
- Fields map directly to Solidity event parameters.

### `subgraph.yaml`
The manifest that configures your subgraph deployment:

```yaml
specVersion: 1.3.0
description: Gravatar for Ethereum
repository: https://github.com/graphprotocol/examples/tree/main/subgraphs/basic-examples/init-subgraph

schema:
  file: ./schema.graphql

dataSources:
  - kind: ethereum/contract
    name: Gravity               # Data source name
    network: mainnet            # Target network
    source:
      address: '0x2E645469f354BB4F5c8a05B3b30A929361cf77eC'
      abi: Gravity
    mapping:
      kind: ethereum/events     # Mapping type
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      file: ./src/mapping.ts    # Mapping implementation
      entities:
        - Gravatar
      abis:
        - name: Gravity
          file: ./artifacts/contracts/Gravity.sol/GravatarRegistry.json
      eventHandlers:
        - event: NewGravatar(uint256,address,string,string)
          handler: handleNewGravatar
        - event: UpdatedGravatar(uint256,address,string,string)
          handler: handleUpdatedGravatar
```

- `specVersion`: Graph spec version.
- `dataSources`: Array of contract sources and their mappings.
- `eventHandlers`: Connect Ethereum events to AssemblyScript functions.

### `src/mapping.ts`
AssemblyScript mapping logic for processing events:

```typescript
import { NewGravatar, UpdatedGravatar } from "../generated/Gravity/Gravity";
import { Gravatar } from "../generated/schema";

// Creates a new Gravatar entity when the NewGravatar event is emitted.
export function handleNewGravatar(event: NewGravatar): void {
  let gravatar = new Gravatar(event.params.id.toHex());
  gravatar.owner = event.params.owner;
  gravatar.displayName = event.params.displayName;
  gravatar.imageUrl = event.params.imageUrl;
  gravatar.save();
}

// Updates an existing Gravatar entity on UpdatedGravatar or creates one if missing.
export function handleUpdatedGravatar(event: UpdatedGravatar): void {
  let id = event.params.id.toHex();
  let gravatar = Gravatar.load(id);
  if (gravatar == null) {
    gravatar = new Gravatar(id);
  }
  gravatar.owner = event.params.owner;
  gravatar.displayName = event.params.displayName;
  gravatar.imageUrl = event.params.imageUrl;
  gravatar.save();
}
```

- Imports generated types for events and schema.
- `event.params` fields map one-to-one with entity attributes.
- `Gravatar.load`: Checks for existing entity to apply updates idempotently.

## Deployment Instructions

### Step 1: Create our Subgraph in Subgraph Studio
Subgraph Studio is where we will interact with our Subgraph and get its endpoints after it has been deployed and is indexing our smart contract's data.

1. Open Subgraph Studio and click Create a Subgraph.
2. Name it. For this example, we will call this subgraph `nft-transfers`.
3. Select the chain where your smart contract is deployed from the network list.
4. Click Save.

### Step 2: Scaffold Locally with the Graph CLI
Now, let's spin up our Subgraph locally to prepare it to deploy to Subgraph Studio.

1. Install the CLI:
   ```bash
   yarn install -g @graphprotocol/graph-cli
   ```
   # npm, yarn, pnpm, and bun can also be used.

2. Inside an empty project folder, run:
   ```bash
   graph init nft-transfers
   ```

3. Follow the prompts:
   - Choose the chain where your smart contract is deployed.
   - Select Smart Contract.
   - Paste your contract address when asked.

The CLI autogenerates three core files:
- `subgraph.yaml` — Manifest of data sources & handlers.
- `schema.graphql` — Entity definitions (already includes a Transfer entity for ERC-721).
- `mapping.ts` — AssemblyScript logic.

### Step 3: Build & Deploy
Now that our Subgraph is scaffolded locally, we can deploy it to Subgraph Studio and begin indexing!

1. Back in your project folder:
   ```bash
   yarn codegen && yarn build
   ```

2. Authenticate once per machine:
   ```bash
   graph auth --studio <DEPLOY_KEY>
   ```

3. Deploy:
   ```bash
   graph deploy --studio nft-transfers
   ```

After the initial sync finishes, Studio will display a GraphQL Playground for further testing.

For more information see the docs on https://thegraph.com/docs/.
