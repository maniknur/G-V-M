/**
 * Blueprint Repository — Off-chain Metadata Storage
 *
 * Each blueprint lives in its own folder under src/data/blueprints/bp-XXX/
 * with a metadata.json containing the full detail: title, description,
 * problem/solution, bill of materials, assembly steps, comments, and
 * optional NFT/IPFS schema for Soroban-minted blueprints.
 *
 * On-chain (Soroban): stores ID, price, creator, IPFS hash (gas-critical).
 * Off-chain (here): full technical documentation, media links, reviews.
 */

const blueprintModules = import.meta.glob<
  Record<string, any>
>("./bp-*/metadata.json", { eager: true });

export const BLUEPRINTS = Object.entries(blueprintModules).map(
  ([_path, mod]) => {
    const data = (mod as any).default ?? mod;
    return { ...data };
  },
);

export function getBlueprintById(id: string) {
  return BLUEPRINTS.find((bp) => bp.id === id) || null;
}

export function getBlueprintsByCategory(category: string) {
  return BLUEPRINTS.filter((bp) => bp.category === category);
}

console.log(
  `[Blueprint Repository] Loaded ${BLUEPRINTS.length} off-chain blueprints`,
);
