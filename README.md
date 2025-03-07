# SUI Battleship MVP

This repository contains the initial implementation of a 2 vs 2 Battleship game on the SUI blockchain using the Move programming language. In this MVP, the actual battleship mechanics are mocked using a simple coinflip mechanism to simulate gameplay. This version supports players participating in multiple games concurrently.

## Overview

The MVP consists of three main modules:
- **House Module:** Manages game definitions, global settings, and fee collection.
- **Game Module:** Handles game requests, game state transitions, and gameplay logic.
- **Escrow Module:** Manages the locking and distribution of bet tokens.

Players can create game requests by staking SUI coins. Another player may accept a game request by matching the bet amount. Players can also directly invite a specific opponent. If a game remains unaccepted, the initiating player can cancel the request and retrieve their tokens.

## Features

- **House Management:**
  - **House Resource:** Stores global game rules, fee settings, and may optionally keep a registry of active or historical games.
  - **House Capability (HouseCap):** Grants exclusive administrative rights (e.g., updating rules, withdrawing fees) and leverages Move's resource model for enforced access control.

- **Game Lifecycle:**
  - **Game Request Initialization:**  
    Any player can initiate a game request by locking a bet in an escrow. The request captures bet details, game parameters, and the player's address.
  - **Game Acceptance & Direct Invitations:**  
    A second player can accept an open game request by matching the bet, or a player can target a specific opponent.
  - **Game Cancellation:**  
    If unaccepted, the initiating player can cancel the game and withdraw their tokens.
  - **Game Resolution:**  
    The coinflip mechanism determines the winner. The winner receives the total pot minus a fee (as defined in the House settings), and fees are accumulated for the house.

- **Multiple Concurrent Games:**
  - Each game is an independent resource, allowing players to participate in multiple games at once.
  - State transitions and escrow management are isolated per game to ensure no interference between concurrent games.

- **Escrow & Token Management:**
  - **Token Locking:**  
    Bet tokens are securely locked in escrow until game resolution or cancellation.
  - **Fund Distribution:**  
    Post-game, funds are transferred based on the outcome, applying fee deductions accordingly.

## Technical Requirements

- **Move Programming Language:**  
  Utilize Move’s strong resource and capability model to enforce state and access control.
  
- **SUI Blockchain Integration:**  
  - Use SUI coins for bet transactions.
  - Support SUI's transaction model and ensure proper state transitions.

- **Modular Design:**  
  - **House Module:**  
    Manages global settings and fee operations using a dedicated HouseCap.
  - **Game Module:**  
    Manages individual game requests and state changes (pending, active, canceled, completed).
  - **Escrow Module:**  
    Manages bet token custody and secure distribution.

## Development Roadmap

1. **Module Design & Resource Definitions:**
   - ~~Define the House resource (including fee settings) and implement the HouseCap for administrative functions~~.
   - Design the Game resource with its state transitions and player mappings.
   - Outline the Escrow mechanism to handle bet token locking and fund distribution.

2. **Implement the House Module:**
   - Create the House resource and associated HouseCap.
   - Implement functions for updating game rules and withdrawing fees.

3. **Implement the Game Module:**
   - Develop game request initiation, acceptance, cancellation, and resolution functions.
   - Integrate a mock coinflip mechanism as a placeholder for full battleship logic.
   - Allow support for direct invitations and multiple concurrent games per player.

4. **Implement the Escrow Module:**
   - Develop token locking during game initiation.
   - Implement secure release of tokens on game cancellation or resolution.

5. **Testing & Auditing:**
   - Write comprehensive tests to validate state transitions, fund handling, and access control.
   - Perform security audits to ensure robust protection against unauthorized actions.

6. **Documentation & Deployment:**
   - Update this README and inline documentation with detailed usage instructions.
   - Prepare deployment scripts and guides for SUI blockchain deployment.

## Conclusion

This MVP establishes a clear, modular foundation for our SUI Battleship game. By leveraging Sui’s Move language and resource model, we ensure robust state management and security. The outlined modules support flexibility, allowing for future expansion from a coinflip-based mechanism to a fully featured battleship game.

