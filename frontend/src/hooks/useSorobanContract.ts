import { useState, useCallback, useRef, useMemo } from "react";
import {
  isConnected,
  getAddress,
} from "@stellar/freighter-api";
import { Client, networks } from "../contracts/gvm";

type ContractError = string | null;

interface UseSorobanContractReturn {
  client: Client;
  address: string | null;
  loading: boolean;
  error: ContractError;
  publicKey: string | null;
  connect: () => Promise<string>;
  disconnect: () => void;
  addBlueprint: (price: bigint, ipfsHash: string) => Promise<any>;
  buyBlueprintNft: (
    tokenAddress: string,
    blueprintId: number,
  ) => Promise<any>;
  verifyBlueprint: (
    blueprintId: number,
    status: boolean,
  ) => Promise<any>;
  getBlueprint: (blueprintId: number) => Promise<any>;
  getOwner: (blueprintId: number) => Promise<string>;
  getAdmin: () => Promise<string>;
}

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = networks.testnet.networkPassphrase;
const CONTRACT_ID = networks.testnet.contractId;

const CONTRACT_OPTS = {
  contractId: CONTRACT_ID,
  networkPassphrase: NETWORK_PASSPHRASE,
  rpcUrl: RPC_URL,
} as const;

function createClient(publicKey: string): Client {
  return new Client({ ...CONTRACT_OPTS, publicKey });
}

export function useSorobanContract(): UseSorobanContractReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ContractError>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const pkRef = useRef<string | null>(null);

  const readOnlyClient = useMemo(
    () => new Client({ ...CONTRACT_OPTS, publicKey: undefined as unknown as string }),
    [],
  );

  const connect = useCallback(async (): Promise<string> => {
    try {
      const connected = await isConnected();
      if (!connected || !connected.isConnected) {
        throw new Error(
          "Freighter wallet not connected. Please install and connect Freighter.",
        );
      }

      const { address } = await getAddress();
      setPublicKey(address);
      pkRef.current = address;
      setError(null);
      return address;
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      throw e;
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    pkRef.current = null;
  }, []);

  const ensureConnected = useCallback(async (): Promise<string> => {
    if (pkRef.current) return pkRef.current;
    return await connect();
  }, [connect]);

  const withTx = useCallback(
    async <T>(fn: (client: Client) => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const pk = await ensureConnected();
        const client = createClient(pk);
        const result = await fn(client);
        return result;
      } catch (e: any) {
        const msg = e?.message || String(e);
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [ensureConnected],
  );

  const addBlueprint = useCallback(
    async (price: bigint, ipfsHash: string) => {
      return withTx(async (client) => {
        const pk = pkRef.current!;
        const tx = await client.add_blueprint({
          creator: pk,
          price,
          ipfs_hash: ipfsHash,
        });
        const result = await tx.signAndSend();
        return result;
      });
    },
    [withTx],
  );

  const buyBlueprintNft = useCallback(
    async (tokenAddress: string, blueprintId: number) => {
      return withTx(async (client) => {
        const pk = pkRef.current!;
        const tx = await client.buy_blueprint_nft({
          token_address: tokenAddress,
          buyer: pk,
          blueprint_id: blueprintId,
        });
        const result = await tx.signAndSend();
        return result;
      });
    },
    [withTx],
  );

  const verifyBlueprint = useCallback(
    async (blueprintId: number, status: boolean) => {
      return withTx(async (client) => {
        const pk = pkRef.current!;
        const tx = await client.verify_blueprint({
          admin: pk,
          blueprint_id: blueprintId,
          status,
        });
        const result = await tx.signAndSend();
        return result;
      });
    },
    [withTx],
  );

  const getBlueprint = useCallback(
    async (blueprintId: number) => {
      return withTx(async (client) => {
        const tx = await client.get_blueprint({ blueprint_id: blueprintId });
        const result = await tx.simulate();
        return result.result;
      });
    },
    [withTx],
  );

  const getOwner = useCallback(
    async (blueprintId: number) => {
      return withTx(async (client) => {
        const tx = await client.get_owner({ blueprint_id: blueprintId });
        const result = await tx.simulate();
        return result.result as string;
      });
    },
    [withTx],
  );

  const getAdmin = useCallback(async () => {
    return withTx(async (client) => {
      const tx = await client.get_admin();
      const result = await tx.simulate();
      return result.result as string;
    });
  }, [withTx]);

  return {
    client: readOnlyClient,
    address: publicKey,
    loading,
    error,
    publicKey,
    connect,
    disconnect,
    addBlueprint,
    buyBlueprintNft,
    verifyBlueprint,
    getBlueprint,
    getOwner,
    getAdmin,
  };
}
