import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getServerSession } from "next-auth";
import { foundry } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import { SUBGRAPH_ENDPOINTS, createAgentKit, getTools } from "~~/utils/chat/tools";
import { siweAuthOptions } from "~~/utils/scaffold-eth/auth";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = (await getServerSession(siweAuthOptions({ chain: foundry }))) as any;
  const userAddress = session?.user?.address;

  if (!userAddress) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();
  const { agentKit, address } = await createAgentKit();

  const uniswapEndpoint =
    typeof SUBGRAPH_ENDPOINTS.UNISWAP_V3 === "function"
      ? SUBGRAPH_ENDPOINTS.UNISWAP_V3()
      : SUBGRAPH_ENDPOINTS.UNISWAP_V3;

  const aaveEndpoint =
    typeof SUBGRAPH_ENDPOINTS.AAVE_V3 === "function" ? SUBGRAPH_ENDPOINTS.AAVE_V3() : SUBGRAPH_ENDPOINTS.AAVE_V3;

  const prompt = `
  You are a helpful assistant, who can answer questions and make certain onchain interactions based on the user's request.
  The connected user's address is: ${userAddress}
  Your address is: ${address}
  
  Here are the contracts that you can help with:
  ${JSON.stringify(deployedContracts, null, 2)}
  
  You have access to several tools:
  1. The chat app has a built-in block explorer so you can link to (for example) /blockexplorer/transaction/<transaction-hash>
  2. You can query The Graph protocol subgraphs using the querySubgraph action
  3. You can use The Graph's MCP (Model Context Protocol) for advanced subgraph discovery and querying:
     - searchSubgraphs: Find relevant subgraphs by keyword
     - getContractSubgraphs: Find subgraphs that index a specific contract
     - getSubgraphSchema: Get the schema for a subgraph to understand available data
     - executeMCPQuery: Execute GraphQL queries through MCP
  4. You can check balances using the contract interactor:
     - For native token balance: Use the "getBalance" action with the user's address
     - For ERC20 token balances: Use the "getBalance" action with the token contract address and user's address

  Example balance queries:
  - Check native token balance: getBalance({ address: "${userAddress}" })
  - Check ERC20 token balance: getBalance({ address: "${userAddress}", tokenAddress: "0x..." })

  If you are trying to query ethereum mainnet, optimisim, arbitrum, or base, bsc or polygon, you can use the following tools:
  1. You can retrieve detailed metadata for a specific ERC20 token using the "getTokenMetadata" tool.
     Parameters:
       - contractAddress: The contract address of the token (e.g., "0x...")
       - networkId: (Optional) The network identifier (e.g., "ethereum", "polygon"). Defaults to the primary network if not specified.
     Example: getTokenMetadata({ contractAddress: "0x...", networkId: "ethereum" })

  2. To get a list of top holders for a token, you can use the "getTokenHolders" tool.
     Parameters:
       - contractAddress: The contract address of the token.
       - networkId: (Optional) The network identifier.
       - pageSize: (Optional) Number of holders to return per page.
       - page: (Optional) Page number.
     Example: getTokenHolders({ contractAddress: "0x...", networkId: "ethereum", pageSize: 10 })

  3. You can fetch token transfers for an address or token using the "getTokenTransfers" tool.
     Parameters:
       - address: (Optional) The wallet address for which to fetch transfers (can be 'to' or 'from' based on context).
       - contractAddress: (Optional) The token contract address to filter transfers for.
       - networkId: (Optional) The network identifier.
       - limit: (Optional) Maximum number of transfers to return.
     Example (transfers for a wallet): getTokenTransfers({ address: "${userAddress}", networkId: "ethereum", limit: 20 })
     Example (transfers for a token): getTokenTransfers({ contractAddress: "0x...", networkId: "ethereum", limit: 20 })

  4. To fetch historical token balances for an address, use the "getHistoricalTokenBalances" tool.
     Parameters:
       - address: The wallet address.
       - networkId: (Optional) The network identifier.
       - contractAddress: (Optional) Specific token contract address to filter by.
       - fromTimestamp: (Optional) Start of the time range (Unix timestamp).
       - toTimestamp: (Optional) End of the time range (Unix timestamp).
       - resolution: (Optional) Time interval for data points (e.g., "1d", "1h").
     Example: getHistoricalTokenBalances({ address: "${userAddress}", networkId: "ethereum", resolution: "1d" })

  5. To retrieve liquidity pools for a token or network, use the "getTokenPools" tool.
     Parameters:
       - tokenAddress: (Optional) The contract address of the token to find pools for.
       - networkId: (Optional) The network identifier.
       - dexes: (Optional) Comma-separated list of DEXes to filter by (e.g., "uniswapv3,sushiswap").
       - pageSize: (Optional) Number of pools to return.
       - page: (Optional) Page number.
     Example (pools for a token): getTokenPools({ tokenAddress: "0x...", networkId: "ethereum", pageSize: 5 })
     Example (pools on a network): getTokenPools({ networkId: "ethereum", dexes: "uniswapv3" })

  6. You can fetch token swap (trade) activity using the "getTokenSwaps" tool.
     Parameters:
       - networkId: (Required) The network identifier (e.g., "ethereum").
       - tokenAddress: (Optional) The token contract address to filter swaps for.
       - walletAddress: (Optional) The wallet address involved in the swaps.
       - fromTimestamp: (Optional) Start of the time range (Unix timestamp).
       - toTimestamp: (Optional) End of the time range (Unix timestamp).
       - pageSize: (Optional) Number of swaps to return.
       - page: (Optional) Page number.
     Example: getTokenSwaps({ networkId: "ethereum", tokenAddress: "0x...", pageSize: 10 })

  7. To get Open, High, Low, Close (OHLC) price data for a token, use the "getTokenOHLCByContract" tool.
     Parameters:
       - contractAddress: (Required) The contract address of the token.
       - networkId: (Optional) The network identifier.
       - fromTimestamp: (Optional) Start of the time range (Unix timestamp).
       - toTimestamp: (Optional) End of the time range (Unix timestamp).
       - resolution: (Optional) Time interval for data points (e.g., "1d", "4h", "1h").
       - limit: (Optional) Number of data points to return.
     Example: getTokenOHLCByContract({ contractAddress: "0x...", networkId: "ethereum", resolution: "1d", limit: 30 })

  8. To get Open, High, Low, Close (OHLC) data for a liquidity pool, use the "getTokenOHLCByPool" tool.
     Parameters:
       - poolAddress: (Required) The address of the liquidity pool.
       - networkId: (Optional) The network identifier.
       - fromTimestamp: (Optional) Start of the time range (Unix timestamp).
       - toTimestamp: (Optional) End of the time range (Unix timestamp).
       - resolution: (Optional) Time interval for data points.
       - tokenAddress: (Optional) The address of one of the tokens in the pair, for price orientation.
     Example: getTokenOHLCByPool({ poolAddress: "0x...", networkId: "ethereum", resolution: "1d" })

  9. For NFT collections, you can use the "getNFTCollections" tool to get collection metadata.
     Parameters:
       - contractAddress: (Required) The NFT contract address.
       - networkId: (Optional) The network identifier.
     Example: getNFTCollections({ contractAddress: "0x...", networkId: "ethereum" })

  10. To get details for a specific NFT, use the "getNFTItems" tool.
      Parameters:
        - contractAddress: (Required) The NFT contract address.
        - tokenId: (Required) The token ID of the specific NFT.
        - networkId: (Optional) The network identifier.
      Example: getNFTItems({ contractAddress: "0x...", tokenId: "1234", networkId: "ethereum" })

  11. To fetch NFT sales data, use the "getNFTSales" tool.
      Parameters:
        - networkId: (Optional) The network identifier.
        - any: (Optional) Filter by any address involved (buyer, seller, or contract).
        - offerer: (Optional) Filter by seller address.
        - recipient: (Optional) Filter by buyer address.
        - token: (Optional) Filter by NFT contract address.
        - startTime: (Optional) Start timestamp (Unix seconds).
        - endTime: (Optional) End timestamp (Unix seconds).
        - limit: (Optional) Maximum number of results.
        - page: (Optional) Page number for pagination.
      Example: getNFTSales({ networkId: "ethereum", token: "0x...", limit: 20 })

  12. To get NFT holders for a collection, use the "getNFTHolders" tool.
      Parameters:
        - contractAddress: (Required) The NFT contract address.
        - networkId: (Optional) The network identifier.
        - page: (Optional) Page number for pagination.
        - pageSize: (Optional) Number of results per page.
      Example: getNFTHolders({ contractAddress: "0x...", networkId: "ethereum", pageSize: 50 })

  13. To get NFT ownerships for a wallet, use the "getNFTOwnerships" tool.
      Parameters:
        - ownerAddress: (Required) The wallet address to query.
        - networkId: (Optional) The network identifier.
        - contractAddress: (Optional) Filter by specific NFT contract.
      Example: getNFTOwnerships({ ownerAddress: "${userAddress}", networkId: "ethereum" })

  14. To get NFT activities (transfers, mints, burns, etc.), use the "getNFTActivities" tool.
      Parameters:
        - networkId: (Optional) The network identifier.
        - contractAddress: (Optional) Filter by NFT contract address.
        - fromAddress: (Optional) Filter by from address.
        - toAddress: (Optional) Filter by to address.
        - tokenId: (Optional) Filter by specific token ID.
        - activityType: (Optional) Filter by activity type (transfer, mint, burn, etc.).
        - startTime: (Optional) Start timestamp (Unix seconds).
        - endTime: (Optional) End timestamp (Unix seconds).
        - limit: (Optional) Maximum number of results.
        - page: (Optional) Page number for pagination.
      Example: getNFTActivities({ networkId: "ethereum", contractAddress: "0x...", limit: 50 })

  For Uniswap V3, use this exact endpoint:
  "${uniswapEndpoint}"

  Example GraphQL query for Uniswap V3:
  {
    endpoint: "${uniswapEndpoint}",
    query: \`query {
      pools(first: 100, orderBy: createdAtTimestamp, orderDirection: desc) {
        id
        token0 { symbol }
        token1 { symbol }
        volumeUSD
        createdAtTimestamp
      }
    }\`
  }

  For Aave V3, use this exact endpoint:
  "${aaveEndpoint}"

  Example GraphQL query for Aave V3:
  {
    endpoint: "${aaveEndpoint}",
    query: \`query {
      borrows(first: 100, orderBy: timestamp, orderDirection: desc) {
        amount
        amountUSD
        asset {
          name
          symbol
        }
      }
    }\`
  }

  Other available subgraph endpoints:
  ${Object.entries(SUBGRAPH_ENDPOINTS)
    .filter(([key]) => key !== "UNISWAP_V3")
    .map(([key, value]) => `${key}: ${typeof value === "function" ? "(function)" : value}`)
    .join("\n")}
  `;

  try {
    console.log("[api/chat] Calling streamText with AI SDK..."); // Log 6: Before calling AI
    const result = await streamText({
      model: openai("gpt-4-turbo-preview"),
      system: prompt,
      messages,
      tools: getTools(agentKit),
    });
    console.log("[api/chat] streamText initial call completed."); // Log 7a: After initial AI call returns stream object

    // --- DEBUG: Log stream parts using async iterator ---
    let loggedToolCalls = 0;
    let loggedText = "";
    console.log("[api/chat] Reading stream parts...");
    for await (const part of result.fullStream) {
      // Use fullStream or potentially another iterator if available
      switch (part.type) {
        case "text-delta":
          // console.log("[api/chat] Stream part: text-delta:", part.textDelta);
          loggedText += part.textDelta;
          break;
        case "tool-call":
          console.log(
            "[api/chat] Stream part: tool-call: ID:",
            part.toolCallId,
            "Name:",
            part.toolName,
            "Args:",
            JSON.stringify(part.args),
          );
          loggedToolCalls++;
          break;
        case "tool-result":
          console.log("[api/chat] Stream part: tool-result:", JSON.stringify(part.result));
          break;
        case "error":
          console.error("[api/chat] Stream part: error:", part.error);
          break;
        // Handle other part types if necessary (e.g., 'finish')
        case "finish":
          console.log("[api/chat] Stream part: finish. Reason:", part.finishReason, "Usage:", part.usage);
          break;
        default:
          // console.log("[api/chat] Stream part: other type:", part.type);
          break;
      }
    }
    console.log(
      `[api/chat] Finished reading stream. Logged ${loggedToolCalls} tool calls. Logged text length: ${loggedText.length}`,
    );
    // --- END DEBUG ---

    // Re-execute to get a fresh stream for the actual response
    console.log("[api/chat] Re-executing streamText to return response...");
    const finalResult = await streamText({
      model: openai("gpt-4-turbo-preview"),
      system: prompt,
      messages,
      tools: getTools(agentKit),
    });

    // Use toDataStreamResponse as indicated by the linter error
    return finalResult.toDataStreamResponse();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[api/chat] Error in POST handler: ${errorMessage}`, error); // Log 8: Catching errors
    return new Response(`Error processing request: ${errorMessage}`, { status: 500 });
  }
}
