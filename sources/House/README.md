# SUI Battleship - House Resource Setup

This README outlines the steps to define the House resource and implement the HouseCap capability for administrative functions in the SUI Battleship MVP. These components manage global fee settings and ensure secure administrative access.

## Overview

- **House Resource:**  
  A global resource that stores game fee settings and optionally other configurations (e.g., a registry of active games). It manages:
  - **Fee Rate:** The fee applied to each game (expressed in basis points, percentage, etc.).
  - **Fees Collected:** The accumulated fees from gameplay.
  
- **HouseCap (House Capability):**  
  An administrative token granting the holder exclusive rights to update fee settings and withdraw fees. It ensures that only an authorized administrator can perform these operations.

## Implementation Steps

### 1. Define the House Resource

- **Create the `House` Struct:**  
  Define a struct that holds the fee rate, fees collected, and optionally other global configurations.
- **Security Attributes:**  
  Use Move's resource modifiers (e.g., `has key`) to secure the resource.

### 2. Define the HouseCap

- **Create the `HouseCap` Struct:**  
  This struct should have no internal fields and serve solely as a capability token.
- **Purpose:**  
  It ensures that only the holder (the administrator) can invoke privileged functions on the House resource.

### 3. Write the Initialization Function

- **Initialization Process:**
  - **Mint the HouseCap:**  
    Create an instance of `HouseCap` and move it to the admin's account.
  - **Initialize the House Resource:**  
    Set up the `House` resource with the initial fee settings and store it under the admin’s address.
- **Ensure One-Time Setup:**  
  The initialization function should only be callable once (or according to your design constraints).

### 4. Implement Administrative Functions

- **Update Fee Rate:**
  - Write a function (e.g., `update_fee_rate`) that requires the HouseCap to update the fee rate in the House resource.
- **Withdraw Fees:**
  - Write a function (e.g., `withdraw_fees`) that uses the HouseCap to authorize fee withdrawal, transferring the collected fees to a designated recipient.


