import type {
  NetworkIdSchema,
  TokenBalancesApiResponseSchema,
  TokenBalancesParamsSchema,
  TokenInfoSchema,
} from "./schemas";
import type { z } from "zod";

// Re-exporting NetworkId type for convenience if needed elsewhere, mirroring the one from useTokenApi
export type NetworkId = z.infer<typeof NetworkIdSchema>;

// Type for the parameters based on the Zod schema
export type TokenBalancesParams = z.infer<typeof TokenBalancesParamsSchema>;

// Type for the expected API response structure for token balances
export type TokenBalancesApiResponse = z.infer<typeof TokenBalancesApiResponseSchema>;

// Type for a single token balance item, inferred from the schema
export type TokenBalance = z.infer<typeof import("./schemas").TokenBalanceSchema>;

// Define TokenInfo type from schema
export type TokenInfo = z.infer<typeof TokenInfoSchema>;

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const API_PROXY_URL = `${NEXT_PUBLIC_BASE_URL}/api/token-proxy`; // Ensure this matches your proxy endpoint

/**
 * Fetches token balances from the token API proxy.
 *
 * @param address The wallet address to fetch balances for.
 * @param params Optional parameters for the API call (e.g., network, pagination).
 * @returns A promise that resolves to the API response for token balances.
 */
export async function fetchTokenBalances(
  address: string,
  params?: TokenBalancesParams,
): Promise<TokenBalancesApiResponse> {
  console.log(`[fetchTokenBalances] Fetching for address: ${address}, Params: ${JSON.stringify(params)}`);

  // Normalize the address (ensure it has 0x prefix if it's an EVM address)
  // This logic might need adjustment based on how non-EVM addresses are handled if supported.
  const normalizedAddress = address.startsWith("0x") || params?.network_id === "unichain" ? address : `0x${address}`;
  const endpoint = `balances/evm/${normalizedAddress}`; // This might need to be dynamic if other chain types are supported by the API

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        // Ensure keys match what the Zod schema and underlying API expect
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`[fetchTokenBalances] Requesting URL: ${url}`);

  try {
    const response = await fetch(url);
    console.log(`[fetchTokenBalances] Response Status: ${response.status}, Status Text: ${response.statusText}`);

    if (!response.ok) {
      const errorBodyText = await response.text(); // Read body as text first for detailed error
      console.error(`[fetchTokenBalances] API error response body: ${errorBodyText}`);
      // Attempt to parse as JSON to extract message if possible, otherwise use text
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBodyText);
        errorMessage = errorJson?.error?.message || errorJson?.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the raw text (truncated if too long)
        errorMessage = `${errorMessage}: ${errorBodyText.substring(0, 200)}${errorBodyText.length > 200 ? "..." : ""}`;
      }
      return { error: { message: errorMessage, status: response.status } };
    }

    // If response is OK, proceed to parse JSON
    const responseBody = await response.json();
    console.log(`[fetchTokenBalances] Raw response body (JSON): ${JSON.stringify(responseBody)}`);

    // The useTokenBalances hook handles responses that are TokenBalance[] or { data: TokenBalance[] }
    // We should normalize this here for the utility function to always return a consistent structure.
    let balancesData: TokenBalance[] = [];
    if (Array.isArray(responseBody)) {
      balancesData = responseBody;
    } else if (responseBody && typeof responseBody === "object" && Array.isArray(responseBody.data)) {
      balancesData = responseBody.data;
    } else if (responseBody && typeof responseBody === "object" && !Array.isArray(responseBody.data)) {
      // If it's an object but data is not an array, this might be an unexpected format or an error object not caught above.
      // Or if the API can return a single object instead of an array for some endpoints/queries.
      // For token balances, an array is expected.
      console.warn("[fetchTokenBalances] Unexpected data format:", responseBody);
      return { error: { message: "Unexpected data format received from API", status: 500 } };
    }
    console.log(`[fetchTokenBalances] Normalized ${balancesData.length} balances.`);
    return { data: balancesData };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token balances";
    console.error(`[fetchTokenBalances] Network/fetch/parsing error: ${message}`, error);
    return { error: { message, status: 500 } }; // Use 500 for client-side or unexpected errors
  }
}

// Add more utility functions here for other token API endpoints, e.g.:
// export async function fetchTokenDetails(contractAddress: string, params?: TokenDetailsParams): Promise<TokenDetailsApiResponse> { ... }
// export async function fetchTokenTransfers(address: string, params?: TokenTransfersParams): Promise<TokenTransfersApiResponse> { ... }

// --- Token Details --- //

// Types inferred from Zod schemas for Token Details
export type TokenDetails = z.infer<typeof import("./schemas").TokenDetailsSchema>;
export type TokenDetailsParams = z.infer<typeof import("./schemas").TokenDetailsParamsSchema>;
export type TokenDetailsApiResponse = z.infer<typeof import("./schemas").TokenDetailsApiResponseSchema>;

/**
 * Fetches token details from the token API proxy.
 *
 * @param contractAddress The contract address of the token.
 * @param params Optional parameters for the API call (e.g., network_id).
 * @returns A promise that resolves to the API response for token details.
 */
export async function fetchTokenDetails(
  contractAddress: string,
  params?: TokenDetailsParams,
): Promise<TokenDetailsApiResponse> {
  if (!contractAddress) {
    // Or handle this more gracefully depending on expected behavior
    return { error: { message: "Contract address is required for token details", status: 400 } };
  }

  // The original hook uses cleanContractAddress, assuming it's available and necessary.
  // If cleanContractAddress is a general utility, it should be moved to a shared utils location.
  // For now, assuming contractAddress is already clean or cleaning is done prior to calling this.
  const endpoint = `tokens/evm/${contractAddress}`; // Path based on useTokenDetails

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params?.network_id) {
    queryParams.append("network_id", params.network_id);
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token details. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Assuming the data is directly the TokenDetails object or wrapped in a 'data' property.
    // The generic useTokenApi handles this; our fetch utility should also be robust.
    if (responseBody && typeof responseBody === "object") {
      if ("data" in responseBody && typeof responseBody.data === "object") {
        return { data: responseBody.data as TokenDetails };
      } else if (Object.keys(responseBody).length > 0 && !("data" in responseBody)) {
        // If it's an object, has keys, and no 'data' property, assume it's the data itself.
        // This matches how useTokenApi handles non-wrapped object responses.
        return { data: responseBody as TokenDetails };
      }
    }
    // If it's not an object or doesn't fit expected structures
    console.warn("Unexpected data format for token details:", responseBody);
    return { error: { message: "Unexpected data format received from API for token details", status: 500 } };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenDetails:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token details";
    return { error: { message, status: 500 } };
  }
}

// --- Token Transfers --- //

// Types inferred from Zod schemas for Token Transfers
export type TokenTransferItem = z.infer<typeof import("./schemas").TokenTransferItemSchema>;
export type TokenTransfersParams = z.infer<typeof import("./schemas").TokenTransfersParamsSchema>;
// The TokenTransfersApiResponseSchema in schemas.ts is defined to wrap TokenTransfersResponseDataSchema,
// which contains the normalized `transfers: TokenTransferItem[]` and other metadata.
export type TokenTransfersApiResponse = z.infer<typeof import("./schemas").TokenTransfersApiResponseSchema>;

/**
 * Fetches token transfers from the token API proxy.
 *
 * @param toAddress The primary address to fetch transfers for (used as the 'to' parameter).
 * @param params Optional parameters for the API call (e.g., from, contract, limit, network_id).
 * @returns A promise that resolves to the API response for token transfers.
 */
export async function fetchTokenTransfers(
  toAddress: string | undefined, // The address is primarily used as the 'to' parameter
  params?: Omit<TokenTransfersParams, "to">, // Params excluding 'to', as toAddress takes precedence
): Promise<TokenTransfersApiResponse> {
  const endpoint = "transfers/evm"; // Based on useTokenTransfers hook

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  // Construct the actual API parameters
  const apiParams: Record<string, any> = {
    ...params, // Spread other parameters like from, contract, limit, age etc.
  };

  if (toAddress) {
    apiParams.to = toAddress; // Set the 'to' parameter from the main address argument
  }

  // It's crucial that network_id is passed if available in params
  if (params?.network_id) {
    apiParams.network_id = params.network_id;
  }

  Object.entries(apiParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, String(value));
    }
  });

  // If no 'to' address is effectively provided (neither toAddress nor params.to) and endpoint requires it,
  // the API might error or return broad results. Consider adding a check if toAddress is mandatory.
  if (!apiParams.to && !apiParams.from && !apiParams.contract) {
    // Example check: if the query is too broad without a primary subject (to/from/contract)
    // return { error: { message: "Address or contract parameter is required for token transfers", status: 400 } };
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token transfers. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Normalize response: API might return transfers in `data` or `transfers` field.
    // The goal is to return a consistent structure as defined by TokenTransfersResponseDataSchema.
    let transferItems: TokenTransferItem[] = [];
    if (responseBody && Array.isArray(responseBody.data)) {
      transferItems = responseBody.data;
    } else if (responseBody && Array.isArray(responseBody.transfers)) {
      transferItems = responseBody.transfers;
    } else if (Array.isArray(responseBody)) {
      // If the response itself is an array of transfers
      transferItems = responseBody;
    }

    // Construct the data part of the response according to TokenTransfersResponseDataSchema
    const responseData = {
      transfers: transferItems,
      statistics: responseBody.statistics,
      pagination: responseBody.pagination,
      results: responseBody.results,
      total_results: responseBody.total_results,
    };

    return { data: responseData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenTransfers:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token transfers";
    return { error: { message, status: 500 } };
  }
}

// --- Token Metadata --- //

// Types inferred from Zod schemas for Token Metadata
export type TokenMetadata = z.infer<typeof import("./schemas").TokenMetadataSchema>;
export type TokenMetadataParams = z.infer<typeof import("./schemas").TokenMetadataParamsSchema>;
export type TokenMetadataApiResponse = z.infer<typeof import("./schemas").TokenMetadataApiResponseSchema>;

function normalizeRawMetadata(rawData: any): Partial<TokenMetadata> {
  if (!rawData || typeof rawData !== "object") return {};

  // Prefer primary field names, use alternatives as fallbacks
  const contractAddress = rawData.contract_address || rawData.address;
  const blockNumber = rawData.block_number || rawData.block_num;
  // Timestamp normalization can be complex; for now, prefer `timestamp`, then `datetime`, then `date`.
  // Further conversion to ISO string might be needed if formats vary wildly.
  const timestamp =
    rawData.timestamp ||
    rawData.datetime ||
    rawData.date ||
    (rawData.block_timestamp ? new Date(rawData.block_timestamp * 1000).toISOString() : undefined);

  return {
    contract_address: typeof contractAddress === "string" ? contractAddress : undefined,
    name: rawData.name,
    symbol: rawData.symbol,
    decimals: typeof rawData.decimals === "number" ? rawData.decimals : undefined,
    total_supply: rawData.total_supply,
    circulating_supply: rawData.circulating_supply,
    block_number: typeof blockNumber === "number" ? blockNumber : undefined,
    timestamp: typeof timestamp === "string" ? timestamp : undefined,
    holders: typeof rawData.holders === "number" ? rawData.holders : undefined,
    logo_url: rawData.logo_url,
    icon: rawData.icon,
    network_id: rawData.network_id,
    market_data: rawData.market_data,
  };
}

/**
 * Fetches token metadata from the token API proxy.
 *
 * @param contractAddress The contract address of the token.
 * @param params Optional parameters for the API call (e.g., network_id, include_market_data).
 * @returns A promise that resolves to the API response for token metadata.
 */
export async function fetchTokenMetadata(
  contractAddress: string,
  params?: TokenMetadataParams,
): Promise<TokenMetadataApiResponse> {
  if (!contractAddress) {
    return { error: { message: "Contract address is required for token metadata", status: 400 } };
  }

  // Assuming contractAddress is already clean or cleaning is done prior to calling this.
  // The original hook normalized it: `contract && !contract.startsWith("0x") ? \`0x${contract}\` : contract`
  // This should ideally be done consistently before calling these utils or within them if deemed safe.
  const normalizedContract = contractAddress.startsWith("0x") ? contractAddress : `0x${contractAddress}`;
  const endpoint = `tokens/evm/${normalizedContract}`; // Path based on useTokenMetadata hook

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params?.network_id) {
    queryParams.append("network_id", params.network_id);
  }
  if (params?.include_market_data !== undefined) {
    queryParams.append("include_market_data", String(params.include_market_data));
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token metadata. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    let rawMetadataObject: any = null;
    if (Array.isArray(responseBody) && responseBody.length > 0) {
      rawMetadataObject = responseBody[0]; // Case 1: Response is an array directly
    } else if (
      responseBody &&
      typeof responseBody === "object" &&
      Array.isArray(responseBody.data) &&
      responseBody.data.length > 0
    ) {
      rawMetadataObject = responseBody.data[0]; // Case 2: Response is an object with data array property
    } else if (
      responseBody &&
      typeof responseBody === "object" &&
      Object.keys(responseBody).length > 0 &&
      !responseBody.data
    ) {
      rawMetadataObject = responseBody; // Case 3: Response is already the token metadata object
    }

    if (rawMetadataObject) {
      const normalized = normalizeRawMetadata(rawMetadataObject);
      // Ensure contract_address is present as it's non-optional in our schema
      if (!normalized.contract_address) {
        normalized.contract_address = normalizedContract; // Fallback to the input contract address if not in response
      }
      return { data: normalized as TokenMetadata }; // Cast as TokenMetadata after normalization
    }

    return { data: null }; // Return null in data field if no metadata found or unexpected structure
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenMetadata:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token metadata";
    return { error: { message, status: 500 } };
  }
}

// --- Token Holders --- //

// Types inferred from Zod schemas for Token Holders
export type TokenHolder = z.infer<typeof import("./schemas").TokenHolderSchema>;
export type TokenHoldersData = z.infer<typeof import("./schemas").TokenHoldersDataSchema>;
export type TokenHoldersParams = z.infer<typeof import("./schemas").TokenHoldersParamsSchema>;
export type TokenHoldersApiResponse = z.infer<typeof import("./schemas").TokenHoldersApiResponseSchema>;

function normalizeRawHolder(rawData: any): Partial<TokenHolder> {
  if (!rawData || typeof rawData !== "object") return {};
  return {
    address: rawData.address,
    balance: rawData.balance,
    balance_usd: rawData.balance_usd,
    last_updated_block: rawData.last_updated_block || rawData.block_num,
    timestamp: rawData.timestamp || rawData.datetime || rawData.date,
    token_share: rawData.token_share || rawData.percent, // Combine token_share and percent
    percent: rawData.percent || rawData.token_share,
  };
}

/**
 * Fetches token holders from the token API proxy.
 *
 * @param contractAddress The contract address of the token.
 * @param params Optional parameters for the API call (e.g., network_id, page, page_size).
 * @returns A promise that resolves to the API response for token holders.
 */
export async function fetchTokenHolders(
  contractAddress: string,
  params?: TokenHoldersParams,
): Promise<TokenHoldersApiResponse> {
  if (!contractAddress) {
    return { error: { message: "Contract address is required for token holders", status: 400 } };
  }

  const normalizedContract = contractAddress.startsWith("0x") ? contractAddress : `0x${contractAddress}`;
  const endpoint = `holders/evm/${normalizedContract}`; // Path based on useTokenHolders hook

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params?.network_id) {
    queryParams.append("network_id", params.network_id);
  }
  if (params?.page !== undefined) {
    queryParams.append("page", String(params.page));
  }
  if (params?.page_size !== undefined) {
    queryParams.append("page_size", String(params.page_size));
  }
  if (params?.include_price_usd !== undefined) {
    queryParams.append("include_price_usd", String(params.include_price_usd));
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token holders. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    let holdersList: TokenHolder[] = [];
    if (responseBody && Array.isArray(responseBody.data)) {
      holdersList = responseBody.data.map((h: any) => normalizeRawHolder(h) as TokenHolder);
    } else if (responseBody && Array.isArray(responseBody.holders)) {
      holdersList = responseBody.holders.map((h: any) => normalizeRawHolder(h) as TokenHolder);
    } else if (Array.isArray(responseBody)) {
      // If response is just an array of holders
      holdersList = responseBody.map((h: any) => normalizeRawHolder(h) as TokenHolder);
    }

    const responseData: TokenHoldersData = {
      contract_address: responseBody.contract_address || normalizedContract,
      holders: holdersList,
      page: responseBody.page || responseBody.pagination?.page,
      page_size: responseBody.page_size || responseBody.pagination?.page_size,
      total_holders: responseBody.total_holders,
      statistics: responseBody.statistics,
      pagination: responseBody.pagination,
    };

    return { data: responseData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenHolders:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token holders";
    return { error: { message, status: 500 } };
  }
}

// --- Token Pools --- //

// Types inferred from Zod schemas for Token Pools
export type Pool = z.infer<typeof import("./schemas").PoolSchema>;
export type PoolsResponseData = z.infer<typeof import("./schemas").PoolsResponseDataSchema>;
export type PoolsParams = z.infer<typeof import("./schemas").PoolsParamsSchema>;
export type TokenPoolsApiResponse = z.infer<typeof import("./schemas").TokenPoolsApiResponseSchema>;

/**
 * Fetches token pools from the token API proxy.
 *
 * @param params Optional parameters for the API call (e.g., network_id, token, page, page_size).
 * @returns A promise that resolves to the API response for token pools.
 */
export async function fetchTokenPools(params?: PoolsParams): Promise<TokenPoolsApiResponse> {
  const endpoint = "pools/evm"; // Path based on useTokenPools hook

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token pools. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // The useTokenPools hook implies the response directly matches PoolsResponse structure.
    // PoolsResponse has { data: Pool[], statistics: ..., pagination: ..., ... }
    // Our PoolsResponseDataSchema in schemas.ts matches this structure.
    // The TokenPoolsApiResponseSchema then wraps this in a top-level 'data' property.
    if (responseBody && typeof responseBody === "object" && Array.isArray(responseBody.data)) {
      // Assuming responseBody is already in the shape of PoolsResponseDataSchema
      return { data: responseBody as PoolsResponseData };
    } else {
      // Fallback if the structure is not as expected, though the original hook implies it is.
      console.warn(
        "Unexpected data format for token pools. Expected object with data array and metadata:",
        responseBody,
      );
      // If API returns just Pool[] in `data` and no other metadata, we might need to adjust.
      // For now, strict check based on PoolsResponse structure.
      if (Array.isArray(responseBody)) {
        // A very raw API might just return Pool[]
        // This case is not directly handled by PoolsResponseDataSchema which expects metadata.
        // If this happens, the schema or API contract understanding needs an update.
      }
    }

    // If we reach here, the format wasn't what PoolsResponseDataSchema expected directly.
    return { error: { message: "Unexpected data format received from API for token pools", status: 500 } };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenPools:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token pools";
    return { error: { message, status: 500 } };
  }
}

// --- Token Swaps --- //

// Types inferred from Zod schemas for Token Swaps
export type Swap = z.infer<typeof import("./schemas").SwapSchema>;
export type SwapsResponseData = z.infer<typeof import("./schemas").SwapsResponseDataSchema>;
export type SwapsParams = z.infer<typeof import("./schemas").SwapsParamsSchema>;
export type TokenSwapsApiResponse = z.infer<typeof import("./schemas").TokenSwapsApiResponseSchema>;

// Helper to normalize the tokenN field which can be string or object
function normalizeSwapTokenInfo(tokenData: any, tokenSymbol?: string): TokenInfo | undefined {
  if (typeof tokenData === "object" && tokenData !== null && tokenData.address) {
    return {
      address: tokenData.address,
      symbol: tokenData.symbol || tokenSymbol || "N/A",
      decimals: typeof tokenData.decimals === "number" ? tokenData.decimals : 18,
    };
  } else if (typeof tokenData === "string") {
    return {
      address: tokenData,
      symbol: tokenSymbol || "N/A",
      decimals: 18,
    };
  }
  return undefined;
}

function normalizeRawSwap(rawData: any): Partial<Swap> {
  if (!rawData || typeof rawData !== "object") return {};
  return {
    block_num: rawData.block_num,
    datetime: rawData.datetime,
    transaction_id: rawData.transaction_id,
    caller: rawData.caller,
    pool: rawData.pool,
    factory: rawData.factory,
    sender: rawData.sender,
    recipient: rawData.recipient,
    network_id: rawData.network_id,
    amount0: rawData.amount0,
    amount1: rawData.amount1,
    token0: normalizeSwapTokenInfo(rawData.token0, rawData.token0_symbol),
    token1: normalizeSwapTokenInfo(rawData.token1, rawData.token1_symbol),
    amount0_usd: rawData.amount0_usd || rawData.value0,
    amount1_usd: rawData.amount1_usd || rawData.value1,
    price0: rawData.price0,
    price1: rawData.price1,
    protocol: rawData.protocol,
  };
}

/**
 * Fetches token swaps from the token API proxy.
 *
 * @param params Parameters for the API call, including network_id and other filters.
 * @returns A promise that resolves to the API response for token swaps.
 */
export async function fetchTokenSwaps(params: SwapsParams): Promise<TokenSwapsApiResponse> {
  const endpoint = "swaps/evm";
  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, String(value));
    }
  });

  if (!params.network_id) {
    return { error: { message: "Network ID is required for token swaps", status: 400 } };
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token swaps. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    if (responseBody && typeof responseBody === "object" && Array.isArray(responseBody.swaps)) {
      const normalizedSwaps = responseBody.swaps.map((s: any) => normalizeRawSwap(s) as Swap);
      const responseData: SwapsResponseData = {
        swaps: normalizedSwaps,
        pagination: responseBody.pagination,
        total: responseBody.total,
      };
      return { data: responseData };
    } else if (Array.isArray(responseBody)) {
      const normalizedSwaps = responseBody.map((s: any) => normalizeRawSwap(s) as Swap);
      const responseData: SwapsResponseData = {
        swaps: normalizedSwaps,
      };
      return { data: responseData };
    }

    console.warn("Unexpected data format for token swaps:", responseBody);
    return { error: { message: "Unexpected data format received from API for token swaps", status: 500 } };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenSwaps:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching token swaps";
    return { error: { message, status: 500 } };
  }
}

// --- Token OHLC by Contract --- //

// Types inferred from Zod schemas
export type OHLCDataPoint = z.infer<typeof import("./schemas").OHLCDataPointSchema>;
export type TokenOHLCByContractResponseData = z.infer<typeof import("./schemas").TokenOHLCByContractResponseDataSchema>;
export type ContractOHLCParams = z.infer<typeof import("./schemas").ContractOHLCParamsSchema>;
export type TokenOHLCByContractApiResponse = z.infer<typeof import("./schemas").TokenOHLCByContractApiResponseSchema>;

// Normalization for a single OHLC data point from either legacy or new format
function normalizeRawOHLCDataPoint(rawData: any): OHLCDataPoint {
  if (rawData.datetime && !rawData.timestamp) {
    // If new format with datetime string, convert to Unix timestamp (seconds)
    // This assumes datetime is a parseable ISO string. Add error handling if needed.
    rawData.timestamp = Math.floor(new Date(rawData.datetime).getTime() / 1000);
  } else if (rawData.timestamp && !rawData.datetime) {
    rawData.datetime = new Date(rawData.timestamp * 1000).toISOString();
  }
  // Ensure timestamp is a number
  const timestamp = typeof rawData.timestamp === "string" ? parseInt(rawData.timestamp, 10) : rawData.timestamp;

  return {
    timestamp: timestamp,
    datetime: rawData.datetime,
    open: rawData.open,
    high: rawData.high,
    low: rawData.low,
    close: rawData.close,
    volume: rawData.volume,
    volume_usd: rawData.volume_usd, // Only in legacy?
    ticker: rawData.ticker, // New format
    uaw: rawData.uaw, // New format
    transactions: rawData.transactions, // New format
  };
}

/**
 * Fetches token OHLC data by contract from the token API proxy.
 *
 * @param contractAddress The contract address of the token.
 * @param params Parameters for the API call (network_id, timestamps, resolution, limit).
 * @returns A promise that resolves to the API response for token OHLC data.
 */
export async function fetchTokenOHLCByContract(
  contractAddress: string,
  params: ContractOHLCParams, // Make params non-optional as original hook has defaults
): Promise<TokenOHLCByContractApiResponse> {
  if (!contractAddress) {
    return { error: { message: "Contract address is required for OHLC data", status: 400 } };
  }

  // The original hook uses toLowerCase() and cleanContractAddress.
  // Assuming cleanContractAddress is a more robust normalization.
  // For now, let's do a simple 0x prefix check, similar to other utils.
  const normalizedContract = contractAddress.startsWith("0x")
    ? contractAddress.toLowerCase()
    : `0x${contractAddress.toLowerCase()}`;
  const endpoint = `ohlc/prices/evm/${normalizedContract}`; // Path from useTokenOHLCByContract

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  // Map ContractOHLCParams to API query parameters
  // The original hook mapped 'timeframe' to 'interval'. We use 'resolution' from schema.
  if (params.network_id) queryParams.append("network_id", params.network_id);
  if (params.from_timestamp) queryParams.append("startTime", String(params.from_timestamp)); // API uses startTime
  if (params.to_timestamp) queryParams.append("endTime", String(params.to_timestamp)); // API uses endTime
  if (params.resolution) queryParams.append("interval", params.resolution); // API uses interval
  if (params.limit) queryParams.append("limit", String(params.limit));

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token OHLC by contract. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    let ohlcPoints: OHLCDataPoint[] = [];
    let responseDataFields: Partial<TokenOHLCByContractResponseData> = {};

    if (responseBody && Array.isArray(responseBody.ohlc)) {
      // Legacy format
      ohlcPoints = responseBody.ohlc.map((p: any) => normalizeRawOHLCDataPoint(p));
      responseDataFields = {
        contract_address: responseBody.contract_address || normalizedContract,
        token_name: responseBody.token_name,
        token_symbol: responseBody.token_symbol,
        token_decimals: responseBody.token_decimals,
        network_id: responseBody.network_id,
        resolution: responseBody.resolution,
      };
    } else if (responseBody && Array.isArray(responseBody.data)) {
      // New API format
      ohlcPoints = responseBody.data.map((p: any) => normalizeRawOHLCDataPoint(p));
      // For new format, top-level metadata might be different or inside statistics/pagination
      // For now, we primarily focus on getting the OHLC points.
      // Contract address can be taken from input if not in response.
      responseDataFields = {
        contract_address: normalizedContract, // Default to input contract
        network_id: params.network_id, // Default to input param
        resolution: params.resolution, // Default to input param
      };
    }

    const finalData: TokenOHLCByContractResponseData = {
      ...responseDataFields,
      ohlc: ohlcPoints,
      statistics: responseBody.statistics,
      pagination: responseBody.pagination,
      results: responseBody.results,
      total_results: responseBody.total_results,
    };

    return { data: finalData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenOHLCByContract:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching OHLC data";
    return { error: { message, status: 500 } };
  }
}

// --- Token OHLC by Pool --- //

// Types inferred from Zod schemas
export type PoolOHLCDataPoint = z.infer<typeof import("./schemas").PoolOHLCDataPointSchema>;
export type TokenOHLCByPoolResponseData = z.infer<typeof import("./schemas").TokenOHLCByPoolResponseDataSchema>;
export type PoolOHLCParams = z.infer<typeof import("./schemas").PoolOHLCParamsSchema>;
export type TokenOHLCByPoolApiResponse = z.infer<typeof import("./schemas").TokenOHLCByPoolApiResponseSchema>;

// Normalization for a single Pool OHLC data point
function normalizeRawPoolOHLCDataPoint(rawData: any): PoolOHLCDataPoint {
  if (rawData.datetime && !rawData.timestamp) {
    rawData.timestamp = Math.floor(new Date(rawData.datetime).getTime() / 1000);
  } else if (rawData.timestamp && !rawData.datetime) {
    rawData.datetime = new Date(rawData.timestamp * 1000).toISOString();
  }
  const timestamp = typeof rawData.timestamp === "string" ? parseInt(rawData.timestamp, 10) : rawData.timestamp;

  return {
    timestamp: timestamp,
    datetime: rawData.datetime,
    open: rawData.open,
    high: rawData.high,
    low: rawData.low,
    close: rawData.close,
    volume_token0: rawData.volume_token0 || (rawData.volume && rawData.token0 ? rawData.volume : 0), // Approximation if only total volume exists
    volume_token1: rawData.volume_token1 || (rawData.volume && rawData.token1 ? rawData.volume : 0), // Approximation
    volume_usd: rawData.volume_usd || rawData.volume, // Assuming 'volume' might be USD volume in some formats
    volume: rawData.volume, // Keep original volume if present
  };
}

/**
 * Fetches token OHLC data by pool from the token API proxy.
 *
 * @param poolAddress The address of the liquidity pool.
 * @param params Parameters for the API call (network_id, timestamps, resolution, pagination, token_address).
 * @returns A promise that resolves to the API response for pool OHLC data.
 */
export async function fetchTokenOHLCByPool(
  poolAddress: string,
  params?: PoolOHLCParams, // Optional as per original hook second signature
): Promise<TokenOHLCByPoolApiResponse> {
  if (!poolAddress) {
    return { error: { message: "Pool address is required for pool OHLC data", status: 400 } };
  }

  // Relying on cleanContractAddress from hook or assuming address is clean.
  // Applying simple normalization here.
  const normalizedPool = poolAddress.startsWith("0x") ? poolAddress.toLowerCase() : `0x${poolAddress.toLowerCase()}`;
  const endpoint = `ohlc/pools/evm/${normalizedPool}`; // Path from useTokenOHLCByPool

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    if (params.network_id) queryParams.append("network_id", params.network_id);
    if (params.from_timestamp) queryParams.append("from_timestamp", String(params.from_timestamp)); // API might use from_timestamp directly
    if (params.to_timestamp) queryParams.append("to_timestamp", String(params.to_timestamp)); // API might use to_timestamp directly
    if (params.resolution) queryParams.append("resolution", params.resolution); // API might use resolution directly
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));
    if (params.token_address) queryParams.append("token_address", params.token_address);
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching token OHLC by pool. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    let ohlcPoints: PoolOHLCDataPoint[] = [];
    // Normalize the primary data array (ohlc or data)
    if (responseBody && Array.isArray(responseBody.ohlc)) {
      ohlcPoints = responseBody.ohlc.map((p: any) => normalizeRawPoolOHLCDataPoint(p));
    } else if (responseBody && Array.isArray(responseBody.data)) {
      ohlcPoints = responseBody.data.map((p: any) => normalizeRawPoolOHLCDataPoint(p));
    }

    // Consolidate metadata (might be at root or in statistics)
    const finalData: TokenOHLCByPoolResponseData = {
      pool_address: responseBody.pool_address || normalizedPool,
      token0_address: responseBody.token0_address || responseBody.statistics?.token0_address,
      token0_symbol: responseBody.token0_symbol || responseBody.statistics?.token0_symbol,
      token0_name: responseBody.token0_name, // Not usually in statistics
      token0_decimals: responseBody.token0_decimals,
      token1_address: responseBody.token1_address || responseBody.statistics?.token1_address,
      token1_symbol: responseBody.token1_symbol || responseBody.statistics?.token1_symbol,
      token1_name: responseBody.token1_name,
      token1_decimals: responseBody.token1_decimals,
      protocol: responseBody.protocol || responseBody.statistics?.protocol,
      network_id: responseBody.network_id || params?.network_id,
      resolution: responseBody.resolution || params?.resolution,
      ohlc: ohlcPoints,
      statistics: responseBody.statistics,
      pagination: responseBody.pagination,
      results: responseBody.results,
      total_results: responseBody.total_results,
    };

    return { data: finalData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchTokenOHLCByPool:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching pool OHLC data";
    return { error: { message, status: 500 } };
  }
}

// --- Historical Balances --- //

// Types inferred from Zod schemas
export type HistoricalBalance = z.infer<typeof import("./schemas").HistoricalBalanceSchema>;
export type TokenBalanceHistory = z.infer<typeof import("./schemas").TokenBalanceHistorySchema>;
export type HistoricalBalancesData = z.infer<typeof import("./schemas").HistoricalBalancesDataSchema>;
export type HistoricalBalancesParams = z.infer<typeof import("./schemas").HistoricalBalancesParamsSchema>;
export type HistoricalBalancesApiResponse = z.infer<typeof import("./schemas").HistoricalBalancesApiResponseSchema>;

// Normalization helpers
function normalizeRawHistoricalBalance(rawData: any): Partial<HistoricalBalance> {
  if (!rawData || typeof rawData !== "object") return {};
  if (rawData.timestamp && !rawData.datetime) {
    // Derive datetime if only timestamp exists
    rawData.datetime = new Date(rawData.timestamp * 1000).toISOString();
  }
  return {
    timestamp: rawData.timestamp,
    block_number: rawData.block_number || rawData.block_num,
    datetime: rawData.datetime || rawData.date, // Prefer datetime over date
    balance: rawData.balance,
    balance_usd: rawData.balance_usd,
    token_price_usd: rawData.token_price_usd || rawData.price_usd, // Normalize price field
  };
}

function normalizeRawTokenBalanceHistory(rawData: any): Partial<TokenBalanceHistory> {
  if (!rawData || typeof rawData !== "object") return {};
  const normalizedBalances = Array.isArray(rawData.balances)
    ? rawData.balances.map((b: any) => normalizeRawHistoricalBalance(b) as HistoricalBalance)
    : [];
  return {
    contract_address: rawData.contract_address,
    token_name: rawData.token_name || rawData.name, // Normalize name
    token_symbol: rawData.token_symbol || rawData.symbol, // Normalize symbol
    token_decimals: rawData.token_decimals || rawData.decimals, // Normalize decimals
    network_id: rawData.network_id,
    balances: normalizedBalances,
  };
}

/**
 * Fetches historical token balances for an address from the token API proxy.
 *
 * @param address The wallet address.
 * @param params Parameters for the API call (network_id, contract_address, timestamps, resolution).
 * @returns A promise that resolves to the API response for historical balances.
 */
export async function fetchHistoricalBalances(
  address: string,
  params?: HistoricalBalancesParams,
): Promise<HistoricalBalancesApiResponse> {
  if (!address) {
    return { error: { message: "Address is required for historical balances", status: 400 } };
  }

  const normalizedAddress = address.startsWith("0x") ? address : `0x${address}`;
  const endpoint = `historical/balances/evm/${normalizedAddress}`; // Path from useHistoricalBalances hook

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        // Assuming schema keys match API query keys (e.g., from_timestamp, to_timestamp, resolution)
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching historical balances. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    let historyList: TokenBalanceHistory[] = [];
    // Normalize response structure (might be direct array or have a 'data' wrapper)
    if (Array.isArray(responseBody)) {
      historyList = responseBody.map((h: any) => normalizeRawTokenBalanceHistory(h) as TokenBalanceHistory);
    } else if (responseBody && Array.isArray(responseBody.data)) {
      historyList = responseBody.data.map((h: any) => normalizeRawTokenBalanceHistory(h) as TokenBalanceHistory);
    } else if (responseBody && typeof responseBody === "object") {
      // Handle case where the response might be a single TokenBalanceHistory object if filtered by contract?
      // Or if the structure is different than expected.
      // For now, assuming it's either array or { data: array }
      console.warn("Unexpected data format for historical balances. Expected array or { data: [...] }:", responseBody);
      // Attempt to normalize if it looks like a single history item (unlikely based on hook)
      const singleNormalized = normalizeRawTokenBalanceHistory(responseBody);
      if (singleNormalized.contract_address && singleNormalized.balances) {
        historyList = [singleNormalized as TokenBalanceHistory];
      } else {
        // If not recognizable, return empty or error
      }
    }

    const finalData: HistoricalBalancesData = {
      history: historyList,
      statistics: responseBody?.statistics, // Pass statistics if present at the root
    };

    return { data: finalData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchHistoricalBalances:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred while fetching historical balances";
    return { error: { message, status: 500 } };
  }
}

// --- NFT Utility Functions ---

// Import NFT types from schemas
export type NFTCollection = z.infer<typeof import("./schemas").NFTCollectionSchema>;
export type NFTCollectionsApiResponse = z.infer<typeof import("./schemas").NFTCollectionsApiResponseSchema>;

export type NFTItem = z.infer<typeof import("./schemas").NFTItemSchema>;
export type NFTItemsApiResponse = z.infer<typeof import("./schemas").NFTItemsApiResponseSchema>;

export type NFTSale = z.infer<typeof import("./schemas").NFTSaleSchema>;
export type NFTSalesApiResponse = z.infer<typeof import("./schemas").NFTSalesApiResponseSchema>;

export type NFTHolder = z.infer<typeof import("./schemas").NFTHolderSchema>;
export type NFTHoldersApiResponse = z.infer<typeof import("./schemas").NFTHoldersApiResponseSchema>;

export type NFTOwnership = z.infer<typeof import("./schemas").NFTOwnershipSchema>;
export type NFTOwnershipsApiResponse = z.infer<typeof import("./schemas").NFTOwnershipsApiResponseSchema>;

export type NFTActivity = z.infer<typeof import("./schemas").NFTActivitySchema>;
export type NFTActivitiesApiResponse = z.infer<typeof import("./schemas").NFTActivitiesApiResponseSchema>;

/**
 * Fetches NFT collection data from the token API proxy.
 */
export async function fetchNFTCollections(
  contractAddress: string,
  params?: { network_id?: NetworkId },
): Promise<NFTCollectionsApiResponse> {
  if (!contractAddress) {
    return { error: { message: "Contract address is required for NFT collections", status: 400 } };
  }

  const normalizedAddress = contractAddress.toLowerCase();
  const endpoint = `nft/collections/evm/${normalizedAddress}`;

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params?.network_id) {
    queryParams.append("network_id", params.network_id);
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching NFT collections. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Normalize response - expect array of collections
    let collectionsData: NFTCollection[] = [];
    if (Array.isArray(responseBody)) {
      collectionsData = responseBody;
    } else if (responseBody?.data && Array.isArray(responseBody.data)) {
      collectionsData = responseBody.data;
    }

    return { data: collectionsData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchNFTCollections:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching NFT collections";
    return { error: { message, status: 500 } };
  }
}

/**
 * Fetches NFT item details from the token API proxy.
 */
export async function fetchNFTItems(
  contractAddress: string,
  tokenId: string,
  params?: { network_id?: NetworkId },
): Promise<NFTItemsApiResponse> {
  if (!contractAddress || !tokenId) {
    return { error: { message: "Contract address and token ID are required for NFT items", status: 400 } };
  }

  const endpoint = `nft/items/evm/contract/${contractAddress}/token_id/${tokenId}`;

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params?.network_id) {
    queryParams.append("network_id", params.network_id);
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching NFT items. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Normalize response - expect array of items
    let itemsData: NFTItem[] = [];
    if (Array.isArray(responseBody)) {
      itemsData = responseBody;
    } else if (responseBody?.data && Array.isArray(responseBody.data)) {
      itemsData = responseBody.data;
    }

    return { data: itemsData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchNFTItems:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching NFT items";
    return { error: { message, status: 500 } };
  }
}

/**
 * Fetches NFT sales data from the token API proxy.
 */
export async function fetchNFTSales(params?: {
  network_id?: NetworkId;
  any?: string;
  offerer?: string;
  recipient?: string;
  contract?: string;
  startTime?: number;
  endTime?: number;
  orderBy?: "timestamp";
  orderDirection?: "asc" | "desc";
  limit?: number;
  page?: number;
}): Promise<NFTSalesApiResponse> {
  const endpoint = "nft/sales/evm";

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && (typeof value === "string" ? value !== "" : true)) {
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching NFT sales. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Normalize response - expect array of sales
    let salesData: NFTSale[] = [];
    if (Array.isArray(responseBody)) {
      salesData = responseBody;
    } else if (responseBody?.data && Array.isArray(responseBody.data)) {
      salesData = responseBody.data;
    }

    return { data: salesData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchNFTSales:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching NFT sales";
    return { error: { message, status: 500 } };
  }
}

/**
 * Fetches NFT holders data from the token API proxy.
 */
export async function fetchNFTHolders(
  contractAddress: string,
  params?: {
    network_id?: NetworkId;
    page?: number;
    page_size?: number;
  },
): Promise<NFTHoldersApiResponse> {
  if (!contractAddress) {
    return { error: { message: "Contract address is required for NFT holders", status: 400 } };
  }

  const endpoint = `nft/holders/evm/${contractAddress}`;

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching NFT holders. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // The NFT holders endpoint returns wrapped data with pagination
    if (responseBody?.data && Array.isArray(responseBody.data)) {
      return {
        data: {
          data: responseBody.data,
          statistics: responseBody.statistics,
          pagination: responseBody.pagination,
        },
      };
    }

    return { error: { message: "Unexpected data format received from NFT holders API", status: 500 } };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchNFTHolders:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching NFT holders";
    return { error: { message, status: 500 } };
  }
}

/**
 * Fetches NFT ownerships data from the token API proxy.
 */
export async function fetchNFTOwnerships(
  ownerAddress: string,
  params?: {
    network_id?: NetworkId;
    contract?: string;
  },
): Promise<NFTOwnershipsApiResponse> {
  if (!ownerAddress) {
    return { error: { message: "Owner address is required for NFT ownerships", status: 400 } };
  }

  const endpoint = `nft/ownerships/evm/${ownerAddress}`;

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && (typeof value === "string" ? value !== "" : true)) {
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching NFT ownerships. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Normalize response - expect array of ownerships
    let ownershipsData: NFTOwnership[] = [];
    if (Array.isArray(responseBody)) {
      ownershipsData = responseBody;
    } else if (responseBody?.data && Array.isArray(responseBody.data)) {
      ownershipsData = responseBody.data;
    }

    return { data: ownershipsData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchNFTOwnerships:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching NFT ownerships";
    return { error: { message, status: 500 } };
  }
}

/**
 * Fetches NFT activities data from the token API proxy.
 */
export async function fetchNFTActivities(params?: {
  network_id?: NetworkId;
  contract?: string;
  from?: string;
  to?: string;
  token_id?: number;
  activity_type?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  page?: number;
}): Promise<NFTActivitiesApiResponse> {
  const endpoint = "nft/activities/evm";

  const queryParams = new URLSearchParams();
  queryParams.append("path", endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && (typeof value === "string" ? value !== "" : true)) {
        queryParams.append(key, String(value));
      }
    });
  }

  const url = `${API_PROXY_URL}?${queryParams.toString()}`;
  console.log(`🌐 Fetching NFT activities. URL: ${url}`);

  try {
    const response = await fetch(url);
    const responseBody = await response.json();

    if (!response.ok) {
      console.error(`🔴 API error (${response.status}) for ${url}:`, responseBody);
      const errorMessage =
        responseBody?.error?.message || responseBody?.message || `API request failed with status ${response.status}`;
      return { error: { message: errorMessage, status: response.status } };
    }

    // Normalize response - expect array of activities
    let activitiesData: NFTActivity[] = [];
    if (Array.isArray(responseBody)) {
      activitiesData = responseBody;
    } else if (responseBody?.data && Array.isArray(responseBody.data)) {
      activitiesData = responseBody.data;
    }

    return { data: activitiesData };
  } catch (error) {
    console.error("❌ Network or parsing error in fetchNFTActivities:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred while fetching NFT activities";
    return { error: { message, status: 500 } };
  }
}
