"use client";

/**
 * Hook for fetching NFT holders data from The Graph Token API
 *
 * IMPORTANT: This hook requires authentication to work properly.
 *
 * Setup Instructions:
 * 1. Get your API token from https://thegraph.com/market/
 * 2. Create a .env.local file in packages/nextjs/ directory
 * 3. Add: NEXT_PUBLIC_GRAPH_TOKEN=your_token_here
 *
 * Alternative: Use API Key instead of token:
 * - Add: NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here
 *
 * Without proper authentication, you'll get 401 unauthorized errors.
 */
import type { NetworkId } from "./useTokenApi";
import { useTokenApi } from "./useTokenApi";

export interface NFTHolder {
  token_standard: string; // ERC721, ERC1155, etc.
  address: string; // Holder's wallet address
  quantity: number; // Number of tokens held
  unique_tokens: number; // Number of unique tokens held
  percentage: number; // Percentage of total supply held
  network_id: NetworkId;
}

export interface NFTHoldersResponse {
  data: NFTHolder[];
  statistics?: {
    elapsed?: number;
    rows_read?: number;
    bytes_read?: number;
  };
}

export interface UseNFTHoldersOptions {
  contractAddress: string; // NFT contract address
  network?: NetworkId;
  enabled?: boolean;
}

/**
 * Normalize contract address to ensure proper format
 */
function normalizeContractAddress(address: string): string {
  if (!address) return address;

  // Remove any whitespace
  const trimmed = address.trim();

  // Ensure it starts with 0x and is lowercase
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return trimmed.toLowerCase();
  } else {
    return `0x${trimmed.toLowerCase()}`;
  }
}

/**
 * React hook to get NFT holders for a specific contract
 */
export function useNFTHolders(options: UseNFTHoldersOptions) {
  const { contractAddress, network = "mainnet", enabled = true } = options;

  const normalizedContractAddress = normalizeContractAddress(contractAddress);

  const endpoint = `nft/holders/evm/${normalizedContractAddress}`;

  const result = useTokenApi<NFTHolder[]>(
    endpoint,
    {
      network_id: network,
    },
    {
      // Skip if contractAddress is not provided, or if the hook is disabled
      skip: !normalizedContractAddress || !enabled,
    },
  );

  // Enhanced debugging and error handling
  if (normalizedContractAddress && !result.isLoading) {
    const isWellKnownContract =
      normalizedContractAddress.toLowerCase() === "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb"; // CryptoPunks

    if (result.error) {
      console.error(`🔴 Error fetching NFT holders for ${normalizedContractAddress}:`, result.error);

      // Specific error handling for authentication issues
      if (result.error.includes("401") || result.error.includes("unauthorized")) {
        console.error(`🔑 Authentication error detected. Please check your Graph API credentials:
        - Set NEXT_PUBLIC_GRAPH_TOKEN or NEXT_PUBLIC_GRAPH_API_KEY in your .env.local file
        - Get your API token from https://thegraph.com/market/`);
      }
    } else if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      console.log(`🔍 No data returned for contract ${normalizedContractAddress}:`, {
        endpoint,
        network,
        enabled,
        isWellKnownContract,
        skip: !normalizedContractAddress || !enabled,
      });

      if (isWellKnownContract) {
        console.warn(`⚠️ This is a well-known contract (CryptoPunks) that should return data. 
        This might indicate an authentication or network issue.`);
      }
    } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      console.log(
        `✅ Successfully fetched NFT holders data for ${normalizedContractAddress}:`,
        `${result.data.length} holders found`,
      );
    }
  }

  return result;
}
