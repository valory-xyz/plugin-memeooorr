import { elizaLogger } from "@elizaos/core";

/**
 * DatabaseProvider is responsible for interacting with the storage layer.
 */
export class DatabaseProvider {
  private storage: Record<string, any>;

  constructor() {
    this.storage = {}; // Use an in-memory store for simplicity
    elizaLogger.log("DatabaseProvider initialized.");
  }

  /**
   * Retrieve data from the database.
   * @param key - The key to fetch data for.
   * @returns The value stored for the given key, or null if not found.
   */
  get<T>(key: string): T | null {
    elizaLogger.log(`Fetching key: ${key}`);
    return this.storage[key] || null;
  }

  /**
   * Save data to the database.
   * @param key - The key to store the data under.
   * @param value - The value to store.
   * @returns True if the operation was successful.
   */
  set<T>(key: string, value: T): boolean {
    try {
      this.storage[key] = value;
      elizaLogger.log(
        `Stored key: ${key} with value: ${JSON.stringify(value)}`,
      );
      return true;
    } catch (error) {
      elizaLogger.error("Failed to store data:", error);
      return false;
    }
  }

  /**
   * Delete a key from the database.
   * @param key - The key to delete.
   * @returns True if the key was successfully deleted.
   */
  delete(key: string): boolean {
    if (key in this.storage) {
      delete this.storage[key];
      elizaLogger.log(`Deleted key: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Get all keys in the database.
   * @returns An array of all keys.
   */
  keys(): string[] {
    return Object.keys(this.storage);
  }
}
