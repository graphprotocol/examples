import { z } from "zod";

// Schema for NetworkId, mirrors the type from useTokenApi.ts
export const NetworkIdSchema = z.enum(["mainnet", "bsc", "base", "arbitrum-one", "optimism", "matic", "unichain"]);

// Schema for TokenBalance, mirrors the interface from useTokenBalances.ts
export const TokenBalanceSchema = z.object({
  contract_address: z.string(),
  amount: z.string(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  decimals: z.number().optional(),
  amount_usd: z.number().optional(),
  price_usd: z.number().optional(),
  logo_url: z.string().optional(),
  icon: z
    .object({
      web3icon: z.string().optional(),
    })
    .optional(),
  network_id: NetworkIdSchema,
});

// Schema for TokenBalancesParams, mirrors the interface from useTokenBalances.ts
export const TokenBalancesParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  min_amount: z.string().optional(),
  contract_address: z.string().optional(),
});

// Schema for the API error response part
export const ApiErrorSchema = z.object({
  message: z.string(),
  status: z.number(),
});

// Generic API Response schema that can wrap any data type
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataType: T) =>
  z.object({
    data: dataType.optional(),
    error: ApiErrorSchema.optional(),
  });

// Specific schema for TokenBalancesResponse, using the generic ApiResponseSchema
// This mirrors the structure of TokenBalancesResponse interface but using Zod
export const TokenBalancesResponseDataSchema = z.object({
  data: z.array(TokenBalanceSchema),
  statistics: z
    .object({
      bytes_read: z.number(),
      rows_read: z.number(),
      elapsed: z.number(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(),
});

// It seems the API can return TokenBalance[] directly or { data: TokenBalance[] }
// We need a schema that can handle both, or the utility function should normalize this.
// For now, let's assume the utility normalizes to TokenBalance[] for the `data` part of ApiResponse.
export const TokenBalancesApiResponseSchema = ApiResponseSchema(z.array(TokenBalanceSchema));

// Schema for TokenDetailsResponse
export const TokenDetailsSchema = z.object({
  address: z.string().describe("Token address"),
  name: z.string().optional().describe("Token name"),
  symbol: z.string().optional().describe("Token symbol"),
  decimals: z.number().optional().describe("Token decimals"),
  network: z.string().optional().describe("Token network"), // This might be the same as network_id or a string representation
});

// Schema for parameters used to fetch token details (primarily network_id, as contract address is in path)
export const TokenDetailsParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(), // Assuming network_id is the query param
});

// API response schema for token details
export const TokenDetailsApiResponseSchema = ApiResponseSchema(TokenDetailsSchema);

// --- Token Transfers Schemas ---

// Schema for TokenTransferItem (chosen as the more detailed one)
export const TokenTransferItemSchema = z.object({
  block_num: z.number(),
  datetime: z.string().optional(), // ISO Date string
  timestamp: z.number().optional(), // Unix timestamp
  date: z.string().optional(), //  Could be a formatted date string
  contract: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(), // Can be a large number
  value: z.number().optional(), // This might be amount as a number, or another value
  transaction_id: z.string(),
  decimals: z.number(),
  symbol: z.string(),
  network_id: z.string(), // Or NetworkIdSchema if it always matches
  price_usd: z.number().optional(),
  value_usd: z.number().optional(),
});

// Schema for the alternative TokenTransfer structure (simplified for now)
// If both are truly possible and distinct, a z.union would be needed.
// For now, focusing on TokenTransferItem as the primary data structure from the response.
// export const TokenTransferSchema = z.object({ ... });

// Schema for TokenTransfersParams
export const TokenTransfersParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(), // This will be set by the primary address in the hook/action
  age: z.number().min(1).max(180).optional().describe("Number of days to look back (1-180, default: 30)"),
  contract: z.string().optional(),
  limit: z.number().min(1).max(500).optional().describe("Maximum number of items returned (1-500, default: 10)"),
  page: z.number().min(1).optional().describe("Page number of results (≥ 1, default: 1)"),
  low_liquidity: z.boolean().optional(),
  start_date: z.string().optional().describe("Start date for filtering in ISO format (YYYY-MM-DDTHH:mm:ssZ)"),
  end_date: z.string().optional().describe("End date for filtering in ISO format (YYYY-MM-DDTHH:mm:ssZ)"),
  startTime: z.number().optional().describe("Start timestamp (Unix timestamp in seconds)"),
  endTime: z.number().optional().describe("End timestamp (Unix timestamp in seconds)"),
  include_prices: z.boolean().optional(),
});

// Schema for TokenTransfersResponse
// The response can have `data: TokenTransferItem[]` or `transfers: TokenTransfer[]`.
// We should aim to normalize this in the fetch utility.
// For the schema, let's define it to expect the normalized data.
export const TokenTransfersResponseDataSchema = z.object({
  // Assuming normalization to a single array of transfers
  transfers: z.array(TokenTransferItemSchema),
  statistics: z
    .object({
      // From original interface
      bytes_read: z.number(),
      rows_read: z.number(),
      elapsed: z.number(),
    })
    .optional(),
  pagination: z
    .object({
      // From original interface
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(),
  results: z.number().optional(), // From original interface
  total_results: z.number().optional(), // From original interface
});

export const TokenTransfersApiResponseSchema = ApiResponseSchema(TokenTransfersResponseDataSchema);

// --- Action Provider related schemas ---

// Schema for the agent to provide arguments for getting token details
export const GetTokenDetailsAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The contract address of the token (e.g., 0x...)."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the token exists (e.g., mainnet, bsc)."),
});

// Schema for the agent to provide arguments for getting token transfers
export const GetTokenTransfersAgentParamsSchema = TokenTransfersParamsSchema.extend({
  // The main address for whom to fetch transfers. Can be 'from' or 'to' or 'either'.
  // The utility function fetchTokenTransfers takes a `toAddress` and other params.
  // The action provider will need to map the agent's request to these.
  // For simplicity, let's assume the agent specifies an address and its role (from/to/either).
  // Or, the agent can use the more specific 'fromAddress' and 'toAddress' fields below.
  address: z.string().describe("The primary wallet address for which to query transfers."),
  // Specify if the address is the sender, receiver, or either.
  // If 'either', the action might need to make two calls or the backend API supports it.
  // For now, let's assume the action will use this to set 'from' or 'to' for the utility.
  addressRole: z
    .enum(["sender", "receiver", "either"])
    .optional()
    .describe(
      "Role of the primary address: sender, receiver, or either. Defaults to 'receiver' (incoming transfers) if not specified.",
    ),

  // Allow agent to specify from/to directly, overriding the primary address/role logic if needed.
  fromAddress: z.string().optional().describe("Filter by sender address."),
  toAddress: z.string().optional().describe("Filter by receiver address."),

  // Time filtering options - prefer startTime/endTime over age for large datasets
  startTime: z
    .number()
    .optional()
    .describe(
      "Start timestamp (Unix timestamp in seconds). Preferred over age parameter for large datasets to avoid timeouts.",
    ),
  endTime: z
    .number()
    .optional()
    .describe(
      "End timestamp (Unix timestamp in seconds). Preferred over age parameter for large datasets to avoid timeouts.",
    ),

  // contractAddress is already in TokenTransfersParamsSchema as 'contract'
  // networkId is already in TokenTransfersParamsSchema as 'network_id'
  // limit, page, age are also already there.
}).omit({
  // Omit 'from' and 'to' from the base TokenTransfersParamsSchema if we are using fromAddress/toAddress
  // or deriving them from 'address' and 'addressRole'. This avoids confusion.
  from: true,
  to: true,
});

// --- Token Metadata Schemas ---

export const MarketDataSchema = z.object({
  price_usd: z.number(),
  price_change_percentage_24h: z.number().optional(),
  market_cap: z.number().optional(),
  total_volume_24h: z.number().optional(),
});

export const TokenMetadataSchema = z.object({
  // Normalize to primary field names
  contract_address: z.string(), // Assuming this will be populated from 'address' if contract_address is missing
  name: z.string().optional(),
  symbol: z.string().optional(),
  decimals: z.number().optional(),
  total_supply: z.string().optional(), // Kept as string due to potential size
  circulating_supply: z.string().optional(), // Kept as string
  block_number: z.number().optional(), // Assuming this is normalized from block_num
  timestamp: z.string().optional(), // ISO string, normalized from datetime/date/block_timestamp
  holders: z.number().optional(),
  logo_url: z.string().optional(),
  icon: z.object({ web3icon: z.string().optional() }).optional(),
  network_id: NetworkIdSchema.optional(), // Or z.string() if it can be other values
  market_data: MarketDataSchema.optional(),
});

// Schema for TokenMetadataParams
export const TokenMetadataParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  include_market_data: z.boolean().optional(),
});

// API response schema for token metadata
// The utility will normalize to return a single TokenMetadata object or null/undefined.
export const TokenMetadataApiResponseSchema = ApiResponseSchema(TokenMetadataSchema.nullable()); // Allow null if not found

// Schema for the agent to provide arguments for getting token metadata
export const GetTokenMetadataAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The contract address of the token (e.g., 0x...)."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the token exists (e.g., mainnet, bsc)."),
  includeMarketData: z
    .boolean()
    .optional()
    .describe("Whether to include market data (price, market cap, etc.). Defaults to false/true based on API."),
});

// --- Token Holders Schemas ---

export const TokenHolderSchema = z.object({
  address: z.string(),
  balance: z.string(), // Kept as string for large numbers
  balance_usd: z.number().optional(),
  // Normalize block_num to last_updated_block
  last_updated_block: z.number().optional(),
  // Normalize datetime/date to timestamp (ISO string or Unix)
  timestamp: z.union([z.string(), z.number()]).optional(), // Could be ISO string or Unix timestamp
  token_share: z.number().optional(), // This might be the same as percent
  percent: z.number().optional(),
});

// Schema for the data part of the TokenHoldersResponse, after normalization
export const TokenHoldersDataSchema = z.object({
  contract_address: z.string().optional(), // Sometimes present at the top level
  holders: z.array(TokenHolderSchema), // Normalized list of holders
  page: z.number().optional(),
  page_size: z.number().optional(),
  total_holders: z.number().optional(),
  statistics: z
    .object({
      // From original interface
      bytes_read: z.number(),
      rows_read: z.number(),
      elapsed: z.number(),
    })
    .optional(),
  pagination: z
    .object({
      // From original interface
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(),
});

// Schema for TokenHoldersParams
export const TokenHoldersParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  include_price_usd: z.boolean().optional(),
});

// API response schema for token holders
export const TokenHoldersApiResponseSchema = ApiResponseSchema(TokenHoldersDataSchema.nullable());

// Schema for the agent to provide arguments for getting token holders
export const GetTokenHoldersAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The contract address of the token (e.g., 0x...)."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the token exists (e.g., mainnet, bsc)."),
  page: z.number().optional().describe("Page number for pagination."),
  pageSize: z.number().optional().describe("Number of holders per page."),
  includePriceUsd: z.boolean().optional().describe("Whether to include USD price for balances."),
});

// --- Token Pools Schemas ---

export const TokenInfoSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number(),
});

export const PoolSchema = z.object({
  block_num: z.number(),
  datetime: z.string(), // ISO Date string
  transaction_id: z.string(),
  factory: z.string(),
  pool: z.string(),
  token0: TokenInfoSchema,
  token1: TokenInfoSchema,
  fee: z.number(),
  protocol: z.string(),
  network_id: z.string(), // Or NetworkIdSchema if it strictly matches
});

// Schema for the data part of PoolsResponse (the actual data returned by API after unwrapping)
export const PoolsResponseDataSchema = z.object({
  data: z.array(PoolSchema),
  statistics: z
    .object({
      bytes_read: z.number(),
      rows_read: z.number(),
      elapsed: z.number(),
    })
    .optional(), // Making optional as per common patterns, adjust if always present
  pagination: z
    .object({
      previous_page: z.number().optional(), // API might use null or omit
      current_page: z.number(),
      next_page: z.number().optional(), // API might use null or omit
      total_pages: z.number(),
    })
    .optional(),
  results: z.number().optional(),
  total_results: z.number().optional(),
  request_time: z.string().optional(),
  duration_ms: z.number().optional(),
});

// Schema for PoolsParams
export const PoolsParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  token: z.string().optional(),
  pool: z.string().optional(),
  symbol: z.string().optional(),
  factory: z.string().optional(),
  protocol: z.string().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
  sort_by: z.enum(["tvl", "creation_date"]).optional(),
  sort_direction: z.enum(["asc", "desc"]).optional(),
  include_reserves: z.boolean().optional(),
});

// API response schema for token pools
export const TokenPoolsApiResponseSchema = ApiResponseSchema(PoolsResponseDataSchema.nullable());

// Schema for the agent to provide arguments for getting token pools
export const GetTokenPoolsAgentParamsSchema = PoolsParamsSchema.extend({
  // PoolsParamsSchema already covers most fields like networkId, token, pool, symbol, factory, protocol, page, pageSize, sortBy, sortDirection
  // No additional fields seem immediately necessary for the agent beyond what PoolsParamsSchema offers.
  // We could add more descriptive texts if needed for the agent.
  tokenAddress: z.string().optional().describe("Filter pools by a specific token address involved in the pool."),
  poolAddress: z.string().optional().describe("Filter by a specific pool address."),
}).omit({
  token: true, // Use tokenAddress instead for clarity for the agent
  pool: true, // Use poolAddress instead for clarity for the agent
});

// --- Token Swaps Schemas ---

// Reusing TokenInfoSchema for token details within a swap
// export const TokenInfoSchema = z.object({ ... }); // Already defined for Pools

export const SwapSchema = z.object({
  block_num: z.number(),
  datetime: z.string(), // ISO Date string
  transaction_id: z.string(),
  caller: z.string(),
  pool: z.string(),
  factory: z.string().optional(),
  sender: z.string(),
  recipient: z.string(),
  network_id: z.string(), // Or NetworkIdSchema if always matches
  amount0: z.string(), // Raw amount for token0
  amount1: z.string(), // Raw amount for token1
  token0: TokenInfoSchema.optional(), // Normalized to always be TokenInfoSchema or undefined
  token1: TokenInfoSchema.optional(), // Normalized to always be TokenInfoSchema or undefined
  // USD values - prefer primary, fallback to alternatives if necessary during normalization
  amount0_usd: z.number().optional(),
  amount1_usd: z.number().optional(),
  // Prices - prefer primary
  price0: z.number().optional(),
  price1: z.number().optional(),
  protocol: z.string().optional(),
});

// Schema for the data part of SwapsResponse
export const SwapsResponseDataSchema = z.object({
  swaps: z.array(SwapSchema),
  pagination: z
    .object({
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(), // Original SwapsResponse makes it non-optional, but good to be defensive
  total: z.number().optional(), // Original SwapsResponse makes it non-optional
});

// Schema for SwapsParams
export const SwapsParamsSchema = z.object({
  network_id: NetworkIdSchema, // Required in original hook
  pool: z.string().optional(),
  caller: z.string().optional(),
  sender: z.string().optional(),
  recipient: z.string().optional(),
  tx_hash: z.string().optional(),
  protocol: z.string().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

// API response schema for token swaps
export const TokenSwapsApiResponseSchema = ApiResponseSchema(SwapsResponseDataSchema.nullable());

// Schema for the agent to provide arguments for getting token swaps
export const GetTokenSwapsAgentParamsSchema = SwapsParamsSchema.extend({
  // SwapsParamsSchema already requires network_id and has optional filters like
  // pool, caller, sender, recipient, tx_hash, protocol, page, page_size.
  // We can add more descriptive texts for the agent if needed or slightly rename for clarity.
  transactionHash: z.string().optional().describe("Filter swaps by a specific transaction hash."),
  poolAddress: z.string().optional().describe("Filter swaps by a specific pool address."),
}).omit({
  tx_hash: true, // Use transactionHash for agent clarity
  pool: true, // Use poolAddress for agent clarity
});

// --- Token OHLC by Contract Schemas ---

export const OHLCDataPointSchema = z.object({
  timestamp: z.number(), // Unix timestamp (seconds or ms - ensure consistency during normalization)
  datetime: z.string().optional(), // ISO datetime string, can be derived from timestamp or vice-versa
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  volume_usd: z.number().optional(),
  // Fields from 'new API response format' if different and relevant after normalization
  ticker: z.string().optional(), // e.g., contract address or symbol
  uaw: z.number().optional(), // Unique Active Wallets?
  transactions: z.number().optional(),
});

// Schema for the data part of ContractOHLCResponse, after normalization
export const TokenOHLCByContractResponseDataSchema = z.object({
  contract_address: z.string().optional(),
  token_name: z.string().optional(),
  token_symbol: z.string().optional(),
  token_decimals: z.number().optional(),
  network_id: NetworkIdSchema.optional(),
  resolution: z.string().optional(), // e.g., "5m", "1h", "1d"
  ohlc: z.array(OHLCDataPointSchema), // Normalized OHLC data points
  // Include other metadata from ContractOHLCResponse if needed post-normalization
  statistics: z
    .object({
      elapsed: z.number(),
      rows_read: z.number(),
      bytes_read: z.number(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(),
  results: z.number().optional(),
  total_results: z.number().optional(),
});

// Schema for ContractOHLCParams for the utility function
export const ContractOHLCParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  from_timestamp: z.number().optional().describe("Start timestamp (Unix seconds)"),
  to_timestamp: z.number().optional().describe("End timestamp (Unix seconds)"),
  resolution: z
    .enum(["5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w"])
    .optional()
    .describe("Time window resolution for OHLC data (e.g., 5m, 1h, 1d)"),
  // 'limit' was used in the hook, let's add it here if the API supports it directly
  limit: z.number().optional().describe("Number of data points to return"),
});

// API response schema for token OHLC by contract
export const TokenOHLCByContractApiResponseSchema = ApiResponseSchema(TokenOHLCByContractResponseDataSchema.nullable());

// Schema for the agent to provide arguments for getting token OHLC data by contract
export const GetTokenOHLCByContractAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The contract address of the token (e.g., 0x...)."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the token exists (e.g., mainnet, bsc)."),
  resolution: z
    .enum(["5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w"])
    .optional()
    .describe("Time window resolution for OHLC data (e.g., 5m, 1h, 1d). Default often 1d."),
  fromTimestamp: z.number().optional().describe("Start timestamp (Unix seconds) for the OHLC data."),
  toTimestamp: z.number().optional().describe("End timestamp (Unix seconds) for the OHLC data."),
  limit: z.number().optional().describe("Number of data points to return (e.g., 100)."),
});

// --- Token OHLC by Pool Schemas ---

// Schema for pool-specific OHLC data points
export const PoolOHLCDataPointSchema = z.object({
  timestamp: z.number(), // Unix timestamp (seconds)
  datetime: z.string().optional(), // ISO datetime string
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume_token0: z.number(),
  volume_token1: z.number(),
  volume_usd: z.number().optional(),
  // Include fields from alternative format if needed after normalization
  volume: z.number().optional(), // This might be volume_usd or a different volume metric
});

// Schema for the data part of PoolOHLCResponse, after normalization
export const TokenOHLCByPoolResponseDataSchema = z.object({
  pool_address: z.string().optional(),
  token0_address: z.string().optional(),
  token0_symbol: z.string().optional(),
  token0_name: z.string().optional(),
  token0_decimals: z.number().optional(),
  token1_address: z.string().optional(),
  token1_symbol: z.string().optional(),
  token1_name: z.string().optional(),
  token1_decimals: z.number().optional(),
  protocol: z.string().optional(),
  network_id: NetworkIdSchema.optional(), // Or z.string()?
  resolution: z.string().optional(),
  ohlc: z.array(PoolOHLCDataPointSchema), // Normalized OHLC data points
  statistics: z
    .object({
      token0_symbol: z.string().optional(), // Metadata might also be here
      token0_address: z.string().optional(),
      token1_symbol: z.string().optional(),
      token1_address: z.string().optional(),
      protocol: z.string().optional(),
      elapsed: z.number(),
      rows_read: z.number(),
      bytes_read: z.number(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(),
  results: z.number().optional(),
  total_results: z.number().optional(),
});

// Schema for PoolOHLCParams for the utility function
export const PoolOHLCParamsSchema = z.object({
  network_id: NetworkIdSchema.optional(),
  from_timestamp: z.number().optional().describe("Start timestamp (Unix seconds)"),
  to_timestamp: z.number().optional().describe("End timestamp (Unix seconds)"),
  resolution: z
    .enum(["5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w"])
    .optional()
    .describe("Time window resolution for OHLC data"),
  page: z.number().optional(),
  page_size: z.number().optional(),
  token_address: z.string().optional().describe("Filter results to pools involving this token address"),
});

// API response schema for token OHLC by pool
export const TokenOHLCByPoolApiResponseSchema = ApiResponseSchema(TokenOHLCByPoolResponseDataSchema.nullable());

// Schema for the agent to provide arguments for getting token OHLC data by pool
export const GetTokenOHLCByPoolAgentParamsSchema = z.object({
  poolAddress: z.string().describe("The address of the liquidity pool."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the pool exists (e.g., mainnet, bsc)."),
  resolution: z
    .enum(["5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w"])
    .optional()
    .describe("Time window resolution for OHLC data (e.g., 5m, 1h, 1d). Default often 1d."),
  fromTimestamp: z.number().optional().describe("Start timestamp (Unix seconds) for the OHLC data."),
  toTimestamp: z.number().optional().describe("End timestamp (Unix seconds) for the OHLC data."),
  page: z.number().optional().describe("Page number for pagination."),
  pageSize: z.number().optional().describe("Number of data points per page."),
  tokenAddress: z.string().optional().describe("Filter OHLC data to pools involving this specific token address."),
});

// --- Historical Balances Schemas ---

export const HistoricalBalanceSchema = z.object({
  timestamp: z.number(), // Unix timestamp (seconds)
  block_number: z.number().optional(), // Normalized from block_num
  datetime: z.string().optional(), // ISO datetime string (can derive from timestamp)
  balance: z.string(), // Keep as string for large numbers
  balance_usd: z.number().optional(),
  token_price_usd: z.number().optional(), // Normalized from price_usd
});

export const TokenBalanceHistorySchema = z.object({
  contract_address: z.string(),
  token_name: z.string().optional(), // Normalized from name
  token_symbol: z.string().optional(), // Normalized from symbol
  token_decimals: z.number().optional(), // Normalized from decimals
  network_id: NetworkIdSchema.optional(), // Or z.string()?
  balances: z.array(HistoricalBalanceSchema),
});

// Schema for the data part of HistoricalBalancesResponse, after normalization
// The API might return TokenBalanceHistory[] directly or wrapped in { data: TokenBalanceHistory[] }
// The utility should normalize to always return this structure.
export const HistoricalBalancesDataSchema = z.object({
  history: z.array(TokenBalanceHistorySchema), // Normalized array of token histories
  statistics: z
    .object({
      bytes_read: z.number(),
      rows_read: z.number(),
      elapsed: z.number(),
    })
    .optional(),
});

// Schema for HistoricalBalancesParams for the utility function
export const HistoricalBalancesParamsSchema = z.object({
  contract_address: z.string().optional().describe("Filter history for a specific token contract address"),
  network_id: NetworkIdSchema.optional(),
  from_timestamp: z.number().optional().describe("Start timestamp (Unix seconds)"),
  to_timestamp: z.number().optional().describe("End timestamp (Unix seconds)"),
  // Ensure API param names are matched (start_timestamp/end_timestamp vs from/to)
  resolution: z.enum(["day", "hour"]).optional().describe("Time resolution (day or hour)"),
});

// API response schema for historical balances
export const HistoricalBalancesApiResponseSchema = ApiResponseSchema(HistoricalBalancesDataSchema.nullable());

// Schema for the agent to provide arguments for getting historical balances
export const GetHistoricalBalancesAgentParamsSchema = z.object({
  address: z.string().describe("The wallet address for which to query historical balances."),
  contractAddress: z.string().optional().describe("Optional: Filter history for a specific token contract address."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID (e.g., mainnet, bsc)."),
  fromTimestamp: z.number().optional().describe("Optional: Start timestamp (Unix seconds) for the history."),
  toTimestamp: z.number().optional().describe("Optional: End timestamp (Unix seconds) for the history."),
  resolution: z
    .enum(["day", "hour"])
    .optional()
    .describe("Optional: Time resolution (day or hour). Default is often day."),
});

// --- NFT Schemas ---

// Schema for NFT Attribute
export const NFTAttributeSchema = z.object({
  trait_type: z.string(),
  value: z.string(),
});

// Schema for NFT Collection
export const NFTCollectionSchema = z.object({
  token_standard: z.string().describe("ERC721, ERC1155, etc."),
  contract: z.string().describe("Contract address"),
  contract_creation: z.string().describe("Contract creation timestamp"),
  contract_creator: z.string().describe("Contract creator address"),
  symbol: z.string().describe("Token symbol"),
  name: z.string().describe("Collection name"),
  base_uri: z.string().optional().describe("Base URI for metadata"),
  total_supply: z.number().describe("Total supply of tokens"),
  total_unique_supply: z.number().optional().describe("Total unique supply"),
  owners: z.number().describe("Number of unique owners"),
  total_transfers: z.number().describe("Total number of transfers"),
  network_id: NetworkIdSchema.describe("Network ID"),
});

// Schema for NFT Collection response
export const NFTCollectionsResponseDataSchema = z.object({
  data: z.array(NFTCollectionSchema),
  statistics: z
    .object({
      elapsed: z.number().optional(),
      rows_read: z.number().optional(),
      bytes_read: z.number().optional(),
    })
    .optional(),
});

// API response schema for NFT collections
export const NFTCollectionsApiResponseSchema = ApiResponseSchema(z.array(NFTCollectionSchema));

// Schema for NFT Item
export const NFTItemSchema = z.object({
  token_id: z.string().describe("Token ID"),
  token_standard: z.enum(["ERC721", "ERC1155"]).describe("Token standard"),
  contract: z.string().describe("Contract address"),
  owner: z.string().describe("Current owner address"),
  symbol: z.string().optional().describe("Token symbol"),
  uri: z.string().optional().describe("Token URI"),
  name: z.string().optional().describe("Token name"),
  image: z.string().optional().describe("Token image URL"),
  description: z.string().optional().describe("Token description"),
  attributes: z.array(NFTAttributeSchema).optional().describe("Token attributes"),
  network_id: NetworkIdSchema.describe("Network ID"),
});

// Schema for NFT Items response
export const NFTItemsResponseDataSchema = z.object({
  data: z.array(NFTItemSchema),
  statistics: z
    .object({
      elapsed: z.number().optional(),
      rows_read: z.number().optional(),
      bytes_read: z.number().optional(),
    })
    .optional(),
});

// API response schema for NFT items
export const NFTItemsApiResponseSchema = ApiResponseSchema(z.array(NFTItemSchema));

// Schema for NFT Sale
export const NFTSaleSchema = z.object({
  timestamp: z.string().describe("Sale timestamp"),
  block_num: z.number().describe("Block number"),
  tx_hash: z.string().describe("Transaction hash"),
  token: z.string().describe("Contract address of the NFT"),
  token_id: z.number().describe("Token ID"),
  symbol: z.string().describe("Token symbol"),
  name: z.string().describe("Token name"),
  offerer: z.string().describe("Seller address"),
  recipient: z.string().describe("Buyer address"),
  sale_amount: z.number().describe("Sale amount"),
  sale_currency: z.string().describe("Sale currency"),
});

// Schema for NFT Sales response
export const NFTSalesResponseDataSchema = z.object({
  data: z.array(NFTSaleSchema),
  statistics: z
    .object({
      elapsed: z.number().optional(),
      rows_read: z.number().optional(),
      bytes_read: z.number().optional(),
    })
    .optional(),
});

// API response schema for NFT sales
export const NFTSalesApiResponseSchema = ApiResponseSchema(z.array(NFTSaleSchema));

// Schema for NFT Holder
export const NFTHolderSchema = z.object({
  owner: z.string().describe("Owner address"),
  balance: z.number().describe("Number of tokens owned"),
  token_standard: z.string().describe("Token standard"),
  contract: z.string().describe("Contract address"),
  network_id: NetworkIdSchema.describe("Network ID"),
});

// Schema for NFT Holders response
export const NFTHoldersResponseDataSchema = z.object({
  data: z.array(NFTHolderSchema),
  statistics: z
    .object({
      elapsed: z.number().optional(),
      rows_read: z.number().optional(),
      bytes_read: z.number().optional(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number(),
      page_size: z.number(),
      total_pages: z.number(),
    })
    .optional(),
});

// API response schema for NFT holders
export const NFTHoldersApiResponseSchema = ApiResponseSchema(NFTHoldersResponseDataSchema);

// Schema for NFT Ownership
export const NFTOwnershipSchema = z.object({
  token_id: z.string().describe("Token ID"),
  owner: z.string().describe("Owner address"),
  contract: z.string().describe("Contract address"),
  token_standard: z.string().describe("Token standard"),
  network_id: NetworkIdSchema.describe("Network ID"),
});

// Schema for NFT Ownerships response
export const NFTOwnershipsResponseDataSchema = z.object({
  data: z.array(NFTOwnershipSchema),
  statistics: z
    .object({
      elapsed: z.number().optional(),
      rows_read: z.number().optional(),
      bytes_read: z.number().optional(),
    })
    .optional(),
});

// API response schema for NFT ownerships
export const NFTOwnershipsApiResponseSchema = ApiResponseSchema(z.array(NFTOwnershipSchema));

// Schema for NFT Activity
export const NFTActivitySchema = z.object({
  timestamp: z.string().describe("Activity timestamp"),
  block_num: z.number().describe("Block number"),
  tx_hash: z.string().describe("Transaction hash"),
  token: z.string().describe("Contract address"),
  token_id: z.number().describe("Token ID"),
  from: z.string().describe("From address"),
  to: z.string().describe("To address"),
  activity_type: z.string().describe("Type of activity (transfer, mint, burn, etc.)"),
  network_id: NetworkIdSchema.describe("Network ID"),
});

// Schema for NFT Activities response
export const NFTActivitiesResponseDataSchema = z.object({
  data: z.array(NFTActivitySchema),
  statistics: z
    .object({
      elapsed: z.number().optional(),
      rows_read: z.number().optional(),
      bytes_read: z.number().optional(),
    })
    .optional(),
});

// API response schema for NFT activities
export const NFTActivitiesApiResponseSchema = ApiResponseSchema(z.array(NFTActivitySchema));

// --- Agent Parameter Schemas for NFT endpoints ---

// Schema for the agent to provide arguments for getting NFT collections
export const GetNFTCollectionsAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The NFT contract address (e.g., 0x...)."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the NFT exists (e.g., mainnet, bsc)."),
});

// Schema for the agent to provide arguments for getting NFT items
export const GetNFTItemsAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The NFT contract address (e.g., 0x...)."),
  tokenId: z.string().describe("The token ID of the specific NFT."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the NFT exists (e.g., mainnet, bsc)."),
});

// Schema for the agent to provide arguments for getting NFT sales
export const GetNFTSalesAgentParamsSchema = z.object({
  networkId: NetworkIdSchema.optional().describe("Optional network ID to filter sales (e.g., mainnet, bsc)."),
  any: z.string().optional().describe("Filter by any address involved (offerer, recipient, token contract)."),
  offerer: z.string().optional().describe("Filter by seller address."),
  recipient: z.string().optional().describe("Filter by buyer address."),
  token: z.string().optional().describe("Filter by NFT contract address."),
  startTime: z.number().optional().describe("Filter by start timestamp (Unix seconds)."),
  endTime: z.number().optional().describe("Filter by end timestamp (Unix seconds)."),
  orderBy: z.enum(["timestamp"]).optional().describe("Order results by timestamp."),
  orderDirection: z.enum(["asc", "desc"]).optional().describe("Order direction (ascending or descending)."),
  limit: z.number().optional().describe("Maximum number of results to return."),
  page: z.number().optional().describe("Page number for pagination."),
});

// Schema for the agent to provide arguments for getting NFT holders
export const GetNFTHoldersAgentParamsSchema = z.object({
  contractAddress: z.string().describe("The NFT contract address (e.g., 0x...)."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID where the NFT exists (e.g., mainnet, bsc)."),
  page: z.number().optional().describe("Page number for pagination."),
  pageSize: z.number().optional().describe("Number of results per page."),
});

// Schema for the agent to provide arguments for getting NFT ownerships
export const GetNFTOwnershipsAgentParamsSchema = z.object({
  ownerAddress: z.string().describe("The wallet address to query NFT ownerships for."),
  networkId: NetworkIdSchema.optional().describe("Optional network ID to filter by (e.g., mainnet, bsc)."),
  contractAddress: z.string().optional().describe("Optional NFT contract address to filter by."),
});

// Schema for the agent to provide arguments for getting NFT activities
export const GetNFTActivitiesAgentParamsSchema = z.object({
  networkId: NetworkIdSchema.optional().describe("Optional network ID to filter activities (e.g., mainnet, bsc)."),
  contractAddress: z.string().optional().describe("Optional NFT contract address to filter by."),
  fromAddress: z.string().optional().describe("Optional from address to filter activities."),
  toAddress: z.string().optional().describe("Optional to address to filter activities."),
  tokenId: z.number().optional().describe("Optional token ID to filter activities."),
  activityType: z.string().optional().describe("Optional activity type to filter by (transfer, mint, burn, etc.)."),
  startTime: z.number().optional().describe("Optional start timestamp (Unix seconds)."),
  endTime: z.number().optional().describe("Optional end timestamp (Unix seconds)."),
  limit: z.number().optional().describe("Maximum number of results to return."),
  page: z.number().optional().describe("Page number for pagination."),
});
