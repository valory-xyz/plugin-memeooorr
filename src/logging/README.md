# Logger Service

This module provides a standardized logging service for the plugin-memeooorr project. It wraps the elizaLogger from @elizaos/core with additional functionality.

## Features

- Namespace-based logging for better organization
- Consistent log formatting
- Multiple log levels (debug, info, warn, error, assert)
- Context support for structured logging

## Usage

### Basic Usage

```typescript
import { logger } from "../logging";

// Basic logging
logger.info("Application started");
logger.error("An error occurred");

// Logging with context
logger.info("User action", { userId: "123", action: "login" });
logger.error("Database error", { query: "SELECT * FROM users", error: "Connection refused" });
```

### Creating a Namespaced Logger

```typescript
import { createLogger } from "../logging";

// Create a logger for a specific module
const twitterLogger = createLogger("twitter");
twitterLogger.info("Twitter client initialized");

// Create a logger for a specific class
const tokenLogger = createLogger("TokenProvider");
tokenLogger.debug("Processing token request");
```

### Log Levels

The logger supports the following log levels:

- `debug`: Detailed information for debugging purposes
- `info`: General information about application progress
- `warn`: Warning situations that might cause issues
- `error`: Error situations that prevent normal operation
- `assert`: Assertions that should always be true

### Using the Log Level Enum

```typescript
import { LogLevel, logger } from "../logging";

// Dynamic log level
const level = process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
logger.log(level, "This message uses a dynamic log level");
```

## Best Practices

1. **Use namespaced loggers**: Create a logger for each module or class to make it easier to filter logs.
2. **Include relevant context**: Add structured data to your logs to make them more useful for debugging.
3. **Use appropriate log levels**: Reserve error logs for actual errors, use debug for detailed information, etc.
4. **Be consistent**: Follow a consistent pattern for log messages within your application.
5. **Don't log sensitive information**: Be careful not to log passwords, tokens, or other sensitive data.

## Integration with Error Handling

The logger integrates well with the error handling system:

```typescript
import { handleError } from "../errors";
import { logger } from "../logging";

try {
  // Some operation that might fail
} catch (error) {
  logger.error("Operation failed", { operation: "processData" });
  handleError(error);
}