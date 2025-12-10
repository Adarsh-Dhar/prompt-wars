import { Idl } from "@coral-xyz/anchor";
import idlJson from "./idl.json";

// Extract program ID from the JSON IDL
export const PREDICTION_MARKET_PROGRAM_ID = idlJson.address;

// Convert Anchor JSON IDL format to TypeScript Idl format
// Anchor JSON uses "writable"/"signer" and "pubkey", while TypeScript Idl uses "isMut"/"isSigner" and "publicKey"
function convertIdl(jsonIdl: any): Idl {
  const convertAccount = (acc: any) => {
    const converted: any = { name: acc.name };
    if (acc.writable !== undefined) converted.isMut = acc.writable;
    if (acc.signer !== undefined) converted.isSigner = acc.signer;
    if (acc.pda) converted.pda = acc.pda;
    if (acc.address) converted.address = acc.address;
    return converted;
  };

  const convertType = (type: any): any => {
    if (typeof type === "string") {
      // Convert "pubkey" to "publicKey"
      return type === "pubkey" ? "publicKey" : type;
    }
    if (type && typeof type === "object") {
      if (type.array) {
        return { array: type.array.map(convertType) };
      }
      if (type.defined) {
        return { defined: type.defined };
      }
      if (type.option) {
        return { option: convertType(type.option) };
      }
      if (type.vec) {
        return { vec: convertType(type.vec) };
      }
    }
    return type;
  };

  const convertField = (field: any) => {
    return {
      ...field,
      type: convertType(field.type),
    };
  };

  // Create a map of type names to their definitions for event field lookup
  const typeMap = new Map<string, any>();
  jsonIdl.types.forEach((type: any) => {
    typeMap.set(type.name, type);
  });

  const idl: any = {
    version: jsonIdl.metadata.version,
    name: jsonIdl.metadata.name,
    instructions: jsonIdl.instructions.map((ix: any) => ({
      name: ix.name,
      discriminator: ix.discriminator,
      accounts: ix.accounts.map(convertAccount),
      args: ix.args.map((arg: any) => ({
        name: arg.name,
        type: convertType(arg.type),
      })),
      returns: ix.returns ? convertType(ix.returns) : undefined,
    })),
    accounts: jsonIdl.accounts.map((acc: any) => {
      // Look up account type from types array if not present
      const accountType = acc.type || (typeMap.get(acc.name)?.type);
      return {
        name: acc.name,
        discriminator: acc.discriminator,
        type: accountType ? {
          kind: accountType.kind,
          fields: accountType.fields?.map(convertField),
        } : undefined,
      };
    }),
    events: jsonIdl.events.map((evt: any) => {
      // Look up event fields from types array if not present in event definition
      const eventType = typeMap.get(evt.name);
      const fields = evt.fields || (eventType?.type?.kind === "struct" ? eventType.type.fields : undefined);
      return {
        name: evt.name,
        discriminator: evt.discriminator,
        fields: fields?.map(convertField),
      };
    }),
    errors: jsonIdl.errors,
    types: jsonIdl.types.map((type: any) => ({
      name: type.name,
      type: {
        kind: type.type.kind,
        fields: type.type.fields?.map(convertField),
        variants: type.type.variants,
      },
    })),
  };

  return idl as Idl;
}

export const predictionMarketIdl = convertIdl(idlJson);

export type PredictionMarketIdl = typeof predictionMarketIdl;

// Helpful reference for client components that want the initialize_market shape
type InstructionDef = PredictionMarketIdl["instructions"][number];
type InitializeMarketDefinition = InstructionDef & { name: "initialize_market" };

export const initializeMarketDefinition: InitializeMarketDefinition | undefined =
  predictionMarketIdl.instructions?.find(
    (ix: InstructionDef): ix is InitializeMarketDefinition => ix?.name === "initialize_market"
  );
