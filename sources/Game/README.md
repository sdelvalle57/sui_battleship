# Game Module Implementation Instructions

This document outlines the detailed steps required to implement the Game Module. The module will manage game request initiation, acceptance, cancellation, and resolution. It will also integrate a mock coinflip mechanism to simulate game outcomes and support direct invitations with the ability for players to engage in multiple concurrent games.

---

## 1. Game Request Management

### 1.1. Initiate Game Request
- **Function Name:** `initiateGameRequest`
- **Inputs:** 
  - Initiator ID
  - (Optional) Opponent ID (for direct invitations)
- **Responsibilities:**
  - Create a new game request with a unique identifier.
  - Set the initial game state to `pending`.
  - Record essential details such as player IDs, timestamp, and game metadata.
  - **Pool Management:**  
    Add the new request to a pool of **initiated game requests**.

### 1.2. Accept Game Request
- **Function Name:** `acceptGameRequest`
- **Inputs:**
  - Game request ID
  - Accepting player ID
- **Responsibilities:**
  - Validate that the game request is in the `pending` state.  
    *Example Error Message:* "Error: Only games in a pending state can be accepted."
  - Update the game status to `active` upon successful acceptance.
  - Optionally, assign player roles or any other game-specific configurations.
  - **Pool Management:**  
    Move the game request from the initiated pool to the pool of **ongoing games**.

### 1.3. Cancel Game Request
- **Function Name:** `cancelGameRequest`
- **Inputs:**
  - Game request ID
  - Requesting player ID (initiator or opponent)
- **Responsibilities:**
  - Ensure the game request is still in a cancellable state (`pending`).  
    *Example Error Message:* "Error: Cannot cancel a game that is not in a pending state."
  - Mark the game request as `cancelled`.
  - Inform all involved players about the cancellation.
  - **Pool Management:**  
    Move the game request from the initiated pool (or ongoing games if applicable) to the pool of **canceled games**.

### 1.4. Resolve Game Request
- **Function Name:** `resolveGameRequest`
- **Inputs:**
  - Game request ID
- **Responsibilities:**
  - Check that the game is in an `active` state.  
    *Example Error Message:* "Error: Only active games can be resolved."
  - Invoke the mock coinflip mechanism to simulate a game outcome.
  - Record the result (e.g., win/loss) and update the game status to `resolved`.
  - Optionally, update player statistics or any game logs.
  - **Pool Management:**  
    Move the game from the ongoing games pool to the pool of **finished games**.

---

## 2. Mock Coinflip Mechanism

### 2.1. Coinflip Function
- **Function Name:** `coinflip`
- **Inputs:** None
- **Responsibilities:**
  - Generate a random outcome (e.g., "heads" or "tails").
  - Return the outcome, which will be used to determine the winner in game resolution.

---

## 3. Support for Direct Invitations and Multiple Concurrent Games

### 3.1. Direct Invitations
- **Requirements:**
  - Enable players to send game invitations directly to one another.
  - Bypass the need for an automated matchmaking process when a direct invitation is sent.
  - Maintain a record of direct invitations and manage their state similarly to game requests.

### 3.2. Multiple Concurrent Games per Player
- **Requirements:**
  - Allow each player to participate in multiple games simultaneously.
  - Ensure every game session is uniquely identifiable.
  - Isolate the state and progress of each game to prevent cross-interference between concurrent sessions.

---

## 4. Additional Implementation Considerations

- **Game State Pools:**
  - Maintain distinct pools for each game state:
    - **Initiated Game Requests:** Newly created and pending game requests.
    - **Ongoing Games:** Active games that have been accepted and are currently in progress.
    - **Canceled Games:** Games that have been canceled before starting or during initiation.
    - **Finished Games:** Games that have been resolved (completed with a win/loss outcome).

- **State Transition Validation:**
  - Implement checks to ensure that:
    - Only games in the `pending` state can be accepted.
    - Only games that are still pending can be canceled.
    - Only games in the `active` state can be resolved.
  - **Error Handling:**  
    Provide meaningful error messages for unauthorized actions or invalid state transitions, ensuring that users understand why an action failed.

