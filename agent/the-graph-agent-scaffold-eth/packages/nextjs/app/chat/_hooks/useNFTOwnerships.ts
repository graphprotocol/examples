"use client";

import type { NetworkId } from "./useTokenApi";
import { useTokenApi } from "./useTokenApi";

export interface NFTOwnership {
  token_id: number;
  token_standard: "ERC721" | "ERC1155";
  contract: string;
  owner: string;
  symbol?: string; // Optional
  uri?: string; // Optional
  name?: string; // Optional
  image?: string; // Optional
  description?: string; // Optional
  network_id: NetworkId;
}

export interface NFTOwnershipsResponse {
  data: NFTOwnership[];
  statistics?: {
    elapsed?: number;
    rows_read?: number;
    bytes_read?: number;
  };
}

export interface UseNFTOwnershipsOptions {
  walletAddress: string; // Changed from address
  network?: NetworkId;
  enabled?: boolean;
  limit?: number;
  page?: number;
  // contract_address was in old options, not in new schema for this endpoint directly
  // cursor is not in the new schema, using page
}

/**
 * React hook to get NFT ownerships for a given wallet address
 */
export function useNFTOwnerships(options: UseNFTOwnershipsOptions) {
  const { walletAddress, network, enabled = true, ...apiParams } = options;

  const endpoint = `nft/ownerships/evm/${walletAddress}`;

  // Prepare query parameters
  const queryParams: any = {
    network_id: network,
    ...apiParams, // Includes limit, page if provided
  };

  return useTokenApi<NFTOwnership[]>(endpoint, queryParams, {
    skip: !walletAddress || !enabled,
  });
}
