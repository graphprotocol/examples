"use client";

import type { NetworkId } from "./useTokenApi";
import { useTokenApi } from "./useTokenApi";

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFTItem {
  token_id: string; // Schema indicates string, example shows number, using string for broader compatibility
  token_standard: "ERC721" | "ERC1155";
  contract: string;
  owner: string;
  symbol?: string; // Optional
  uri?: string; // Optional
  name?: string; // Optional
  image?: string; // Optional
  description?: string; // Optional
  attributes?: NFTAttribute[]; // Optional
  network_id: NetworkId;
}

export interface NFTItemsResponse {
  data: NFTItem[]; // Schema shows data is an array of items
  statistics?: {
    elapsed?: number;
    rows_read?: number;
    bytes_read?: number;
  };
}

export interface UseNFTItemsOptions {
  contractAddress: string; // Changed from contract
  tokenId: string; // Changed to string as token_id in path is usually a string, API schema example is number, but path param is integer.
  network?: NetworkId;
  enabled?: boolean;
}

/**
 * React hook to get NFT item details
 */
export function useNFTItems(options: UseNFTItemsOptions) {
  const { contractAddress, tokenId, network, enabled = true } = options;

  const endpoint = `nft/items/evm/contract/${contractAddress}/token_id/${tokenId}`;

  return useTokenApi<NFTItem[]>(
    endpoint,
    {
      network_id: network,
    },
    {
      skip: !contractAddress || !tokenId || !enabled,
    },
  );
}
