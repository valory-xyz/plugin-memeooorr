export const MemeooorrFSM = {
  defaultStartState: "LoadDatabaseRound",
  finalStates: ["FinishedToResetRound", "FinishedToSettlementRound"],
  startStates: [
    "ActionPreparationRound",
    "LoadDatabaseRound",
    "PullMemesRound",
  ],
  states: {
    LoadDatabaseRound: {
      transitions: {
        DONE: "PullMemesRound",
        NO_MAJORITY: "LoadDatabaseRound",
        ROUND_TIMEOUT: "LoadDatabaseRound",
      },
    },
    PullMemesRound: {
      transitions: {
        DONE: "CollectFeedbackRound",
        NO_MAJORITY: "PullMemesRound",
        ROUND_TIMEOUT: "PullMemesRound",
      },
    },
    // Additional states follow similar structure
  },
};
