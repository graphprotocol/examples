"use client";

import type { NetworkId } from "./useTokenApi";
import { useTokenApi } from "./useTokenApi";

export interface NFTSale {
  timestamp: string;
  block_num: number;
  tx_hash: string;
  token: string; // Contract address of the NFT
  token_id: number;
  symbol: string;
  name: string;
  offerer: string; // Seller address
  recipient: string; // Buyer address
  sale_amount: number;
  sale_currency: string;
}

export interface NFTSalesResponse {
  data: NFTSale[];
  statistics?: {
    elapsed?: number;
    rows_read?: number;
    bytes_read?: number;
  };
}

export interface UseNFTSalesOptions {
  network?: NetworkId;
  enabled?: boolean;
  any?: string; // Filter by any address involved (offerer, recipient, token contract)
  offerer?: string; // Seller address
  recipient?: string; // Buyer address
  token?: string; // NFT Contract address - maps to `contract_address` from old hook
  // token_id was in old hook options, but is not a filter for /nft/sales/evm.
  // It could be used client-side to filter results if needed.
  startTime?: number;
  endTime?: number;
  orderBy?: "timestamp";
  orderDirection?: "asc" | "desc";
  limit?: number;
  page?: number;
  // marketplace was in old hook, not in new schema. Removed.
  // cursor is not in the new schema, using page. Removed.
}

/**
 * React hook to get NFT sales
 */
export function useNFTSales(options: UseNFTSalesOptions = {}) {
  const { network, enabled = true, ...apiParams } = options;

  const endpoint = "nft/sales/evm";

  // Prepare query parameters - map 'token' to 'contract' for API
  const { token, ...otherParams } = apiParams;
  const queryParams: any = {
    network_id: network,
    ...otherParams,
  };

  // Map token field to contract for the API
  if (token) {
    queryParams.contract = token;
  }

  return useTokenApi<NFTSale[]>(endpoint, queryParams, {
    skip: !enabled,
  });
}
