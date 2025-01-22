import { elizaLogger } from "@elizaos/core";
import { DatabaseProvider } from "./databaseProvider";

/**
 * StateProvider manages the runtime state of the application.
 */
export class StateProvider {
  private static instance: StateProvider | null = null;
  private state: Record<string, any>;

  private constructor(private database: DatabaseProvider) {
    this.state = {};
    elizaLogger.log("StateProvider initialized.");
  }

  /**
   * Get the singleton instance of the StateProvider.
   * @param database - The DatabaseProvider instance to use.
   * @returns The StateProvider instance.
   */
  static getInstance(database: DatabaseProvider): StateProvider {
    if (!StateProvider.instance) {
      StateProvider.instance = new StateProvider(database);
    }
    return StateProvider.instance;
  }

  /**
   * Get a value from the runtime state.
   * @param key - The key to fetch from the state.
   * @returns The value associated with the key, or null if not found.
   */
  get<T>(key: string): T | null {
    elizaLogger.log(`Fetching state key: ${key}`);
    return this.state[key] || this.database.get<T>(key);
  }

  /**
   * Set a value in the runtime state and persist it in the database.
   * @param key - The key to set in the state.
   * @param value - The value to store.
   * @returns True if the operation was successful.
   */
  set<T>(key: string, value: T): boolean {
    try {
      this.state[key] = value;
      this.database.set(key, value);
      elizaLogger.log(
        `State updated: key=${key}, value=${JSON.stringify(value)}`,
      );
      return true;
    } catch (error) {
      elizaLogger.error("Failed to update state:", error);
      return false;
    }
  }

  /**
   * Delete a key from the runtime state and the database.
   * @param key - The key to delete.
   * @returns True if the key was successfully deleted.
   */
  delete(key: string): boolean {
    if (key in this.state) {
      delete this.state[key];
    }
    return this.database.delete(key);
  }

  /**
   * Get all keys in the runtime state.
   * @returns An array of all keys.
   */
  keys(): string[] {
    return Object.keys(this.state);
  }
}
