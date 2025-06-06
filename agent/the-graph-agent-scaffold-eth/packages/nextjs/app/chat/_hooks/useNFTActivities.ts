"use client";

import type { NetworkId } from "./useTokenApi";
import { useTokenApi } from "./useTokenApi";

export interface NFTActivity {
  "@type": "TRANSFER" | "MINT" | "BURN";
  block_num: number;
  block_hash: string;
  timestamp: string;
  tx_hash: string;
  contract: string;
  symbol?: string; // Optional based on schema (not in required list)
  name?: string; // Optional based on schema (not in required list)
  from: string;
  to: string;
  token_id: number;
  amount: number;
  transfer_type?: string; // Optional based on schema
  token_standard?: string; // Optional based on schema
}

export interface NFTActivitiesResponse {
  data: NFTActivity[];
  statistics?: {
    elapsed?: number;
    rows_read?: number;
    bytes_read?: number;
  };
}

export interface UseNFTActivitiesOptions {
  network?: NetworkId;
  enabled?: boolean;
  contract_address: string; // REQUIRED: NFT contract address - renamed from 'contract' to avoid conflict, will be mapped
  any?: string; // Filter by any address involved (from, to, contract)
  from?: string;
  to?: string;
  token_id?: string; // This was in the old options, but not in new schema for activities endpoint. Retaining for now, but will not be passed to API.
  type?: string[]; // This was in the old options, API uses "@type". This will need to be handled or removed.
  startTime?: number;
  endTime?: number;
  orderBy?: "timestamp";
  orderDirection?: "asc" | "desc";
  limit?: number;
  page?: number;
  // cursor?: string; // cursor is not in the new schema, using page for pagination
}

/**
 * React hook to get NFT activities
 */
export function useNFTActivities(options: UseNFTActivitiesOptions) {
  const { network, enabled = true, contract_address, token_id, type, ...apiParams } = options;

  const endpoint = "nft/activities/evm";

  // Prepare query parameters, mapping names if necessary
  const queryParams: any = {
    network_id: network,
    ...apiParams,
  };

  if (contract_address) {
    queryParams.contract = contract_address;
  }

  // The 'type' (e.g. ["mint", "transfer"]) and 'token_id' params from the old hook
  // are not directly supported by the new /nft/activities/evm endpoint in the provided schema.
  // The API filters by `@type` for individual activity types (TRANSFER, MINT, BURN) but not as an array.
  // Token ID is not a filter for the general activities endpoint.
  // These will be ignored for the API call if not handled specifically.
  // For simplicity, they are currently ignored.

  return useTokenApi<NFTActivity[]>(endpoint, queryParams, {
    skip: !enabled || !contract_address,
  });
}
