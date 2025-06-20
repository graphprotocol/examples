import { ActionProvider, CreateAction, WalletProvider, Network } from "@coinbase/agentkit";
import { z } from "zod";
import { fetchTokenBalances } from "../token-api/utils";
import type { TokenBalancesParams } from "../token-api/utils";
import {
  TokenBalancesParamsSchema,
  // TokenBalanceSchema, // Not directly used in this file anymore for agent response type, but good for reference
  NetworkIdSchema,
  GetTokenDetailsAgentParamsSchema,
  GetTokenTransfersAgentParamsSchema,
  GetTokenMetadataAgentParamsSchema,
  GetTokenHoldersAgentParamsSchema,
  GetTokenPoolsAgentParamsSchema,
  GetTokenSwapsAgentParamsSchema,
  GetTokenOHLCByContractAgentParamsSchema,
  GetTokenOHLCByPoolAgentParamsSchema,
  GetHistoricalBalancesAgentParamsSchema,
  // NFT schemas
  GetNFTCollectionsAgentParamsSchema,
  GetNFTItemsAgentParamsSchema,
  GetNFTSalesAgentParamsSchema,
  GetNFTHoldersAgentParamsSchema,
  GetNFTOwnershipsAgentParamsSchema,
  GetNFTActivitiesAgentParamsSchema,
} from "../token-api/schemas";
import { fetchTokenDetails, fetchTokenTransfers, fetchTokenMetadata, fetchTokenHolders, fetchTokenPools, fetchTokenSwaps, fetchTokenOHLCByContract, fetchTokenOHLCByPool, fetchHistoricalBalances, fetchNFTCollections, fetchNFTItems, fetchNFTSales, fetchNFTHolders, fetchNFTOwnerships, fetchNFTActivities } from "../token-api/utils";
import type { TokenDetailsParams, TokenTransfersParams, TokenMetadataParams, TokenHoldersParams, PoolsParams, SwapsParams, ContractOHLCParams, PoolOHLCParams, HistoricalBalancesParams } from "../token-api/utils";

// Define the schema for the arguments the agent will provide for getTokenBalances
const GetTokenBalancesAgentParamsSchema = z.object({
  address: z.string().describe("The wallet address (e.g., 0x... or ENS name). ENS names need prior resolution to an address."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID to filter by (e.g., mainnet, bsc)."),
  contractAddresses: z.array(z.string()).optional().describe("Optional list of specific token contract addresses to fetch."),
  minAmountUsd: z.number().optional().describe("Optional minimum USD value for a balance to be included.")
});


class TokenApiProvider extends ActionProvider<WalletProvider> { // Use WalletProvider as a generic base
  constructor() {
    super(
      "token-api-provider",
      // Description (second arg) is not part of the base ActionProvider constructor based on common patterns.
      // The base ActionProvider constructor usually takes (name: string, tools: TTool[]).
      // Let's assume no specific tools are being injected into this provider itself.
      [] // Pass an empty array for tools if none are specifically associated with this provider instance
    );
    // The description is usually part of the @CreateAction decorator or a class property, not super().
  }

  // Implement the required supportsNetwork method
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supportsNetwork = (network: Network): boolean => {
    // This provider is not network-specific in itself, as network is a parameter to its actions.
    // So, it supports all networks conceptually, or this can be made more specific if needed.
    return true;
  };

  @CreateAction({
    name: "get-token-balances",
    description: "Fetches ERC20 token balances for a given wallet address. Can filter by network or specific tokens.",
    schema: GetTokenBalancesAgentParamsSchema,
  })
  async getTokenBalances(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetTokenBalancesAgentParamsSchema>
  ): Promise<string> {
    console.log(`[TokenApiProvider] Action: getTokenBalances invoked. Args: ${JSON.stringify(args)}`);

    if (!args.address) {
      console.error("[TokenApiProvider] Error: Wallet address is required.");
      return "Error: Wallet address is required.";
    }

    const fetchParams: TokenBalancesParams = {
      network_id: args.networkId,
    };
    console.log(`[TokenApiProvider] Calling fetchTokenBalances with address: ${args.address}, params: ${JSON.stringify(fetchParams)}`);

    try {
      const response = await fetchTokenBalances(args.address, fetchParams);
      console.log(`[TokenApiProvider] fetchTokenBalances response: ${JSON.stringify(response)}`);

      if (response.error) {
        console.error(`[TokenApiProvider] Error from fetchTokenBalances: ${response.error.message}`);
        return `Error fetching token balances: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || response.data.length === 0) {
        console.log(`[TokenApiProvider] No token balances found for address ${args.address}`);
        return `No token balances found for address ${args.address} ${args.networkId ? 'on ' + args.networkId : ''}.`;
      }

      let results = response.data;

      // Client-side filtering (post-fetch)
      if (args.contractAddresses && args.contractAddresses.length > 0) {
        console.log(`[TokenApiProvider] Filtering balances for contracts: ${args.contractAddresses.join(", ")}`);
        const lowerCaseContracts = args.contractAddresses.map(c => c.toLowerCase());
        results = results.filter(balance => lowerCaseContracts.includes(balance.contract_address.toLowerCase()));
      }
      if (args.minAmountUsd !== undefined) {
        console.log(`[TokenApiProvider] Filtering balances with min USD value: ${args.minAmountUsd}`);
        results = results.filter(balance => balance.amount_usd !== undefined && balance.amount_usd >= args.minAmountUsd!);
      }

      if (results.length === 0) {
         console.log(`[TokenApiProvider] No balances matched criteria for address ${args.address}`);
        return `No token balances matched the specified criteria for address ${args.address}.`;
      }

      const formattedResults = results.map(b => ({
        token: b.symbol || b.name || b.contract_address,
        balance: b.amount,
        valueUSD: b.amount_usd?.toFixed(2),
        network: b.network_id,
      }));
      
      const resultString = JSON.stringify(formattedResults, null, 2);
      console.log(`[TokenApiProvider] Successfully formatted ${formattedResults.length} balances.`);
      // Avoid logging potentially huge strings
      // console.log(`[TokenApiProvider] Result string: ${resultString}`); 
      return resultString;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error(`[TokenApiProvider] Unexpected error in getTokenBalances action: ${errorMessage}`, error);
      return `Error: ${errorMessage}`;
    }
  }

  @CreateAction({
    name: "get-token-details",
    description: "Fetches details for a specific token contract (e.g., name, symbol, decimals).",
    schema: GetTokenDetailsAgentParamsSchema,
  })
  async getTokenDetails(
    _walletProvider: WalletProvider, // Included for consistency with ActionProvider type
    args: z.infer<typeof GetTokenDetailsAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenDetails, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress) {
      return "Error: Contract address is required to get token details.";
    }

    // Assuming cleanContractAddress might be needed here too, or applied in fetchTokenDetails.
    // For now, pass as is. If cleanContractAddress is from a UI utility, 
    // consider making a non-UI version available for agentkit utils or apply here.
    // const normalizedContract = cleanContractAddress(args.contractAddress); // Example if needed
    const normalizedContract = args.contractAddress; // Assuming it's already clean or handled by API/fetch util

    const fetchParams: TokenDetailsParams = {
      network_id: args.networkId,
    };

    try {
      const response = await fetchTokenDetails(normalizedContract, fetchParams);

      if (response.error) {
        return `Error fetching token details: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data) {
        return `No details found for contract ${args.contractAddress} ${args.networkId ? 'on ' + args.networkId : ''}.`;
      }

      // Format for the agent. Can be a summary or JSON string.
      // Adjust formatting as needed for the agent's consumption.
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenDetails action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-transfers",
    description: "Fetches token transfers involving a specific address or contract. Can filter by sender, receiver, date range, etc. If addressRole is not specified, defaults to showing incoming transfers (receiver). If no time filters are provided, automatically applies a 7-day lookback to prevent API timeouts.",
    schema: GetTokenTransfersAgentParamsSchema,
  })
  async getTokenTransfers(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenTransfersAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenTransfers, Args: ${JSON.stringify(args)}`);

    const { address, addressRole, fromAddress, toAddress, age, startTime, endTime, ...otherParams } = args;

    let finalToAddress: string | undefined = toAddress;
    let finalFromAddress: string | undefined = fromAddress;

    if (address) {
      // Default to "receiver" if no role is specified (most common use case)
      const role = addressRole || "receiver";
      
      if (role === "receiver" && !finalToAddress) {
        finalToAddress = address;
      } else if (role === "sender" && !finalFromAddress) {
        finalFromAddress = address;
      } else if (role === "either") {
        // For "either", we'll default to receiver for now
        // TODO: In the future, this could make two API calls and merge results
        if (!finalToAddress) finalToAddress = address;
        console.log(`📝 Note: Using address as receiver for "either" role. Consider making separate queries for complete results.`);
      }
    }
    
    // More specific error message with guidance
    if (!finalToAddress && !finalFromAddress && !otherParams.contract) {
        return `Error: Please specify one of the following:
- An address with a role (receiver/sender/either) 
- A fromAddress (sender)
- A toAddress (receiver)  
- A contract address to filter by

Examples:
- To see incoming transfers: specify addressRole as "receiver" (this is the default)
- To see outgoing transfers: specify addressRole as "sender"
- To see transfers for a specific token: provide the contract address`;
    }

    // Handle time filtering - prefer startTime/endTime over age to avoid timeouts
    let finalStartTime: number | undefined = startTime;
    let finalEndTime: number | undefined = endTime;
    let finalAge: number | undefined = age;

    // If age is provided but no explicit start/end times, convert age to timestamps
    // This helps avoid API timeouts for large datasets
    if (age && !startTime && !endTime) {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      finalEndTime = now;
      finalStartTime = now - (age * 24 * 60 * 60); // Convert days to seconds
      finalAge = undefined; // Remove age since we're using timestamps
    }

    // If NO time filtering is provided at all, default to last 7 days to prevent timeouts
    if (!age && !startTime && !endTime) {
      const now = Math.floor(Date.now() / 1000);
      finalEndTime = now;
      finalStartTime = now - (7 * 24 * 60 * 60); // Default to 7 days
      console.log(`📅 No time filter provided. Defaulting to last 7 days to prevent API timeout.`);
    }

    // Prepare parameters for the fetchTokenTransfers utility
    // The utility expects `toAddress` as first arg, and other params (including `from`) in the second.
    const utilityParams: Omit<TokenTransfersParams, 'to'> = {
        ...otherParams, // network_id, contract, limit, etc.
        from: finalFromAddress, // This can be undefined, and fetchTokenTransfers handles it
        age: finalAge, // Only use age if startTime/endTime are not set
        startTime: finalStartTime,
        endTime: finalEndTime,
    };

    try {
      // finalToAddress is the first argument to fetchTokenTransfers
      const response = await fetchTokenTransfers(finalToAddress, utilityParams);

      if (response.error) {
        return `Error fetching token transfers: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.transfers || response.data.transfers.length === 0) {
        const roleText = addressRole || "receiver";
        return `No token transfers found for address ${address} as ${roleText} on ${otherParams.network_id || 'mainnet'}. Try:
- Different addressRole (sender/receiver/either)
- Different network
- Longer time period
- Check if the address has any token activity`;
      }

      // The response.data from fetchTokenTransfers includes { transfers: [], pagination: {}, ... }
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenTransfers action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-metadata",
    description: "Fetches metadata for a specific token contract, like name, symbol, decimals, supply, and optionally market data.",
    schema: GetTokenMetadataAgentParamsSchema,
  })
  async getTokenMetadata(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenMetadataAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenMetadata, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress) {
      return "Error: Contract address is required to get token metadata.";
    }

    // Contract address normalization is handled by the fetchTokenMetadata utility
    const fetchParams: TokenMetadataParams = {
      network_id: args.networkId,
      include_market_data: args.includeMarketData,
    };

    try {
      const response = await fetchTokenMetadata(args.contractAddress, fetchParams);

      if (response.error) {
        return `Error fetching token metadata: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data) {
        return `No metadata found for contract ${args.contractAddress} ${args.networkId ? 'on ' + args.networkId : ''}.`;
      }

      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenMetadata action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-holders",
    description: "Fetches a list of token holders for a specific token contract, with optional pagination.",
    schema: GetTokenHoldersAgentParamsSchema,
  })
  async getTokenHolders(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenHoldersAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenHolders, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress) {
      return "Error: Contract address is required to get token holders.";
    }

    const fetchParams: TokenHoldersParams = {
      network_id: args.networkId,
      page: args.page,
      page_size: args.pageSize,
      include_price_usd: args.includePriceUsd,
    };

    try {
      // Contract address normalization is handled by the fetchTokenHolders utility
      const response = await fetchTokenHolders(args.contractAddress, fetchParams);

      if (response.error) {
        return `Error fetching token holders: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.holders || response.data.holders.length === 0) {
        return `No holders found for contract ${args.contractAddress} ${args.networkId ? 'on ' + args.networkId : ''}.`;
      }
      
      // response.data is TokenHoldersData, which includes the holders array and pagination/stats
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenHolders action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-pools",
    description: "Fetches liquidity pools. Can be filtered by network, token, pool address, symbol, factory, or protocol. Supports pagination and sorting.",
    schema: GetTokenPoolsAgentParamsSchema,
  })
  async getTokenPools(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenPoolsAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenPools, Args: ${JSON.stringify(args)}`);

    const { tokenAddress, poolAddress, ...otherFilters } = args;

    const fetchParams: PoolsParams = {
      ...otherFilters, 
      token: tokenAddress, 
      pool: poolAddress,   
    };

    try {
      const response = await fetchTokenPools(fetchParams);

      if (response.error) {
        return `Error fetching token pools: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        let message = "No token pools found";
        if (tokenAddress) message += ` for token ${tokenAddress}`;
        if (poolAddress) message += ` for pool ${poolAddress}`;
        if (args.network_id) message += ` on ${args.network_id}`;
        message += ".";
        return message;
      }
      
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenPools action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-swaps",
    description: "Fetches token swap transactions. Requires a network ID and can be filtered by pool, caller, sender, recipient, transaction hash, or protocol. Supports pagination.",
    schema: GetTokenSwapsAgentParamsSchema,
  })
  async getTokenSwaps(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenSwapsAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenSwaps, Args: ${JSON.stringify(args)}`);

    // network_id is required by GetTokenSwapsAgentParamsSchema (inherited from SwapsParamsSchema)
    if (!args.network_id) {
      return "Error: Network ID is required to get token swaps.";
    }

    const { transactionHash, poolAddress, ...otherFilters } = args;

    const fetchParams: SwapsParams = {
      ...otherFilters, // Includes network_id, caller, sender, recipient, protocol, page, page_size
      tx_hash: transactionHash, // Map agent-friendly name to utility param name
      pool: poolAddress,      // Map agent-friendly name to utility param name
    };

    try {
      const response = await fetchTokenSwaps(fetchParams);

      if (response.error) {
        return `Error fetching token swaps: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.swaps || response.data.swaps.length === 0) {
        let message = `No token swaps found on ${args.network_id}`;
        if (poolAddress) message += ` for pool ${poolAddress}`;
        if (transactionHash) message += ` for tx ${transactionHash}`;
        message += ".";
        return message;
      }
      
      // response.data is SwapsResponseData, includes swaps array and pagination/total
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenSwaps action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-ohlc-by-contract",
    description: "Fetches Open, High, Low, Close (OHLC) price data for a specific token contract. Requires contract address. Can specify network, resolution, time range, and limit.",
    schema: GetTokenOHLCByContractAgentParamsSchema,
  })
  async getTokenOHLCByContract(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenOHLCByContractAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenOHLCByContract, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress) {
      return "Error: Contract address is required to get OHLC data.";
    }

    const fetchParams: ContractOHLCParams = {
      network_id: args.networkId,
      resolution: args.resolution,
      from_timestamp: args.fromTimestamp,
      to_timestamp: args.toTimestamp,
      limit: args.limit,
    };

    try {
      // Contract address normalization is handled by the fetch utility
      const response = await fetchTokenOHLCByContract(args.contractAddress, fetchParams);

      if (response.error) {
        return `Error fetching OHLC data: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.ohlc || response.data.ohlc.length === 0) {
        let message = `No OHLC data found for contract ${args.contractAddress}`;
        if (args.networkId) message += ` on ${args.networkId}`;
        if (args.resolution) message += ` with ${args.resolution} resolution`;
        message += ".";
        return message;
      }
      
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenOHLCByContract action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-token-ohlc-by-pool",
    description: "Fetches Open, High, Low, Close (OHLC) price data for a specific liquidity pool. Requires pool address. Can specify network, resolution, time range, involved token, and pagination.",
    schema: GetTokenOHLCByPoolAgentParamsSchema,
  })
  async getTokenOHLCByPool(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetTokenOHLCByPoolAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getTokenOHLCByPool, Args: ${JSON.stringify(args)}`);

    if (!args.poolAddress) {
      return "Error: Pool address is required to get pool OHLC data.";
    }

    const fetchParams: PoolOHLCParams = {
      network_id: args.networkId,
      resolution: args.resolution,
      from_timestamp: args.fromTimestamp,
      to_timestamp: args.toTimestamp,
      page: args.page,
      page_size: args.pageSize,
      token_address: args.tokenAddress,
    };

    try {
      // Pool address normalization is handled by the fetch utility
      const response = await fetchTokenOHLCByPool(args.poolAddress, fetchParams);

      if (response.error) {
        return `Error fetching pool OHLC data: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.ohlc || response.data.ohlc.length === 0) {
        let message = `No OHLC data found for pool ${args.poolAddress}`;
        if (args.networkId) message += ` on ${args.networkId}`;
        if (args.resolution) message += ` with ${args.resolution} resolution`;
        if (args.tokenAddress) message += ` involving token ${args.tokenAddress}`;
        message += ".";
        return message;
      }
      
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getTokenOHLCByPool action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-historical-balances",
    description: "Fetches the historical token balances for a wallet address. Can optionally filter by a specific token contract, time range, and resolution (day/hour).",
    schema: GetHistoricalBalancesAgentParamsSchema,
  })
  async getHistoricalBalances(
    _walletProvider: WalletProvider, // Included for consistency
    args: z.infer<typeof GetHistoricalBalancesAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getHistoricalBalances, Args: ${JSON.stringify(args)}`);

    if (!args.address) {
      return "Error: Wallet address is required to get historical balances.";
    }

    // Map agent params to utility params
    const fetchParams: HistoricalBalancesParams = {
      contract_address: args.contractAddress,
      network_id: args.networkId,
      from_timestamp: args.fromTimestamp,
      to_timestamp: args.toTimestamp,
      resolution: args.resolution,
    };

    try {
      // Address normalization is handled by the fetch utility
      const response = await fetchHistoricalBalances(args.address, fetchParams);

      if (response.error) {
        return `Error fetching historical balances: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.history || response.data.history.length === 0) {
        let message = `No historical balances found for address ${args.address}`;
        if (args.contractAddress) message += ` for token ${args.contractAddress}`;
        if (args.networkId) message += ` on ${args.networkId}`;
        message += ".";
        return message;
      }
      
      return JSON.stringify(response.data, null, 2);

    } catch (error) {
      console.error("Error in getHistoricalBalances action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  // --- NFT Actions ---

  @CreateAction({
    name: "get-nft-collections",
    description: "Fetches NFT collection data for a specific contract address. Returns collection metadata including name, symbol, total supply, and owner count.",
    schema: GetNFTCollectionsAgentParamsSchema,
  })
  async getNFTCollections(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetNFTCollectionsAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getNFTCollections, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress) {
      return "Error: Contract address is required to get NFT collection data.";
    }

    try {
      const response = await fetchNFTCollections(args.contractAddress, {
        network_id: args.networkId,
      });

      if (response.error) {
        return `Error fetching NFT collections: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || response.data.length === 0) {
        return `No NFT collection found for contract ${args.contractAddress}${args.networkId ? ` on ${args.networkId}` : ''}.`;
      }

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in getNFTCollections action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-nft-items",
    description: "Fetches details for a specific NFT item by contract address and token ID. Returns metadata, owner, and attributes.",
    schema: GetNFTItemsAgentParamsSchema,
  })
  async getNFTItems(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetNFTItemsAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getNFTItems, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress || !args.tokenId) {
      return "Error: Contract address and token ID are required to get NFT item details.";
    }

    try {
      const response = await fetchNFTItems(args.contractAddress, args.tokenId, {
        network_id: args.networkId,
      });

      if (response.error) {
        return `Error fetching NFT items: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || response.data.length === 0) {
        return `No NFT item found for contract ${args.contractAddress} token ID ${args.tokenId}${args.networkId ? ` on ${args.networkId}` : ''}.`;
      }

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in getNFTItems action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-nft-sales",
    description: "Fetches NFT sales data. Can filter by network, addresses (buyer/seller), contract, time range, and pagination.",
    schema: GetNFTSalesAgentParamsSchema,
  })
  async getNFTSales(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetNFTSalesAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getNFTSales, Args: ${JSON.stringify(args)}`);

    try {
      const response = await fetchNFTSales({
        network_id: args.networkId,
        any: args.any,
        offerer: args.offerer,
        recipient: args.recipient,
        contract: args.token,
        startTime: args.startTime,
        endTime: args.endTime,
        orderBy: args.orderBy,
        orderDirection: args.orderDirection,
        limit: args.limit,
        page: args.page,
      });

      if (response.error) {
        return `Error fetching NFT sales: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || response.data.length === 0) {
        return `No NFT sales found${args.networkId ? ` on ${args.networkId}` : ''} with the specified criteria.`;
      }

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in getNFTSales action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-nft-holders",
    description: "Fetches NFT holders for a specific contract address. Returns list of addresses and their token counts with pagination support.",
    schema: GetNFTHoldersAgentParamsSchema,
  })
  async getNFTHolders(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetNFTHoldersAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getNFTHolders, Args: ${JSON.stringify(args)}`);

    if (!args.contractAddress) {
      return "Error: Contract address is required to get NFT holders.";
    }

    try {
      const response = await fetchNFTHolders(args.contractAddress, {
        network_id: args.networkId,
        page: args.page,
        page_size: args.pageSize,
      });

      if (response.error) {
        return `Error fetching NFT holders: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        return `No NFT holders found for contract ${args.contractAddress}${args.networkId ? ` on ${args.networkId}` : ''}.`;
      }

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in getNFTHolders action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-nft-ownerships",
    description: "Fetches NFT ownerships for a specific wallet address. Returns all NFTs owned by the address, optionally filtered by contract.",
    schema: GetNFTOwnershipsAgentParamsSchema,
  })
  async getNFTOwnerships(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetNFTOwnershipsAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getNFTOwnerships, Args: ${JSON.stringify(args)}`);

    if (!args.ownerAddress) {
      return "Error: Owner address is required to get NFT ownerships.";
    }

    try {
      const response = await fetchNFTOwnerships(args.ownerAddress, {
        network_id: args.networkId,
        contract: args.contractAddress,
      });

      if (response.error) {
        return `Error fetching NFT ownerships: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || response.data.length === 0) {
        return `No NFT ownerships found for address ${args.ownerAddress}${args.networkId ? ` on ${args.networkId}` : ''}${args.contractAddress ? ` for contract ${args.contractAddress}` : ''}.`;
      }

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in getNFTOwnerships action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }

  @CreateAction({
    name: "get-nft-activities",
    description: "Fetches NFT activities (transfers, mints, burns, etc.). Can filter by network, contract, addresses, token ID, activity type, time range, and pagination.",
    schema: GetNFTActivitiesAgentParamsSchema,
  })
  async getNFTActivities(
    _walletProvider: WalletProvider,
    args: z.infer<typeof GetNFTActivitiesAgentParamsSchema>
  ): Promise<string> {
    console.log(`Action: getNFTActivities, Args: ${JSON.stringify(args)}`);

    try {
      const response = await fetchNFTActivities({
        network_id: args.networkId,
        contract: args.contractAddress,
        from: args.fromAddress,
        to: args.toAddress,
        token_id: args.tokenId,
        activity_type: args.activityType,
        startTime: args.startTime,
        endTime: args.endTime,
        limit: args.limit,
        page: args.page,
      });

      if (response.error) {
        return `Error fetching NFT activities: ${response.error.message} (Status: ${response.error.status})`;
      }

      if (!response.data || response.data.length === 0) {
        return `No NFT activities found${args.networkId ? ` on ${args.networkId}` : ''} with the specified criteria.`;
      }

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      console.error("Error in getNFTActivities action:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return `Error: ${message}`;
    }
  }
}

export const tokenApiProvider = () => new TokenApiProvider(); 