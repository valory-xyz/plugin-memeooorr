# plugin-memeooorr
Eliza plugin for memeoor Agent developed on autonolas framework.

> :warning: **Warning** <br />
> The code within this repository is provided without any warranties. It is important to note that the code has not been audited for potential security vulnerabilities.
> Using this code could potentially lead to loss of funds, compromised data, or asset risk.
> Exercise caution and use this code at your own risk. Please refer to the [LICENSE](./LICENSE) file for details about the terms and conditions.
> The plugin for now is specifically designed to be used with [agents-fun-eliza](https://github.com/valory-xyz/agents-fun-eliza).

# Eliza Twitter Plugin

## Overview

The **Eliza Twitter Plugin** is a modular component built on the ElizaOS framework, designed to empower autonomous agents with the ability to interact with Twitter and analyze cryptocurrency tokens. It enables agents to process messages, execute advanced decision-making, and perform various Twitter-based actions such as posting tweets, replying, liking, retweeting, and analyzing feedback.

This plugin provides:

- **Actions**: Encapsulate logic for processing agent messages and generating responses.
- **Services**: Twitter-specific functionality using ElizaOS clients.
- **Integrations**: Leverages ElizaOS's modular architecture for seamless adaptability.

## Features

### Actions
1. **decideTwitterAction**
   - Analyzes a persona, previous tweets, and engagement metrics to determine the next Twitter action.
   - Supports actions such as tweet, reply, like, retweet, follow, and more.

2. **decideTokenAction**
   - Assists agents in managing meme tokens by analyzing the token lifecycle and making strategic decisions like summoning, hearting, or unleashing tokens.
   - Incorporates Twitter engagement metrics for holistic decision-making.

### Services
The **TwitterService** integrates with the ElizaOS `client-twitter` module to:

- Post tweets.
- Reply to tweets with conversational threads.
- Perform rate-limited, authenticated Twitter interactions.
- Format and handle alerts related to cryptocurrency trading.

## Installation

### Prerequisites
- **Node.js**: Ensure Node.js is installed (version 14.x or higher).
- **pnpm**: Install `pnpm` as the package manager.
- **ElizaOS**: The plugin requires the ElizaOS core framework.

## Usage

### Actions

#### Decide Twitter Action
This action analyzes the agent's persona, past tweets, and other tweets to recommend the next engagement on Twitter.

Example:
```typescript
const result = await runtime.invokeAction('decideTwitterAction', {
    persona: "Crypto Enthusiast",
    previousTweets: ["Exploring new meme tokens!", "The crypto market is thriving!"],
    otherTweets: ["What are your top picks this season?", "Check out this new token!"],
    time: "2025-01-22 12:00:00"
});
```

#### Decide Token Action
This action helps agents manage meme tokens and decide on the next steps to maximize portfolio value.

Example:
```typescript
const result = await runtime.invokeAction('decideTokenAction', {
    memeCoins: [/* list of tokens */],
    latestTweet: "The market is on fire!",
    tweetResponses: [/* feedback */],
    balance: 5
});
```

### Services

#### Reply to a Tweet

Use the `TwitterService` to reply to a specific tweet:

```typescript
await twitterService.buildConversationThread(tweet, maxReplies);
```


## Development

### Directory Structure
- **actions/**: Contains the action logic.
- **services/**: Implements services to interact with Twitter.
- **constants/**: Stores shared constants and configurations.
- **types/**: Defines TypeScript interfaces and types.

### Running Tests
Use the following command to run the test suite:

```bash
pnpm test
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push the branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.


### Contact

For support or inquiries, reach out to (mailto:info@valory.xyz).
