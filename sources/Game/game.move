module battleship::game;

use sui::package;

/// Enum to represent the possible game states.
public enum GameState has store {
    Pending,
    Cancelled,
    Active,
    Finished,
    Resolution,
    Resolved,
}

public struct GamePool has key {
    id: UID,
    pool: vector<GameRequest>,
}

/// Holder of the next move in a game.
public struct TurnCap has key {
    id: UID,
    game: ID,
}

public struct GAME has drop {}

/// Resource representing a game request.
/// Each request is uniquely identified by a UID.
public struct GameRequest has key, store {
    id: UID,
    initiator: address,
    opponent: Option<address>, // Optional opponent for direct invitations.
    state: GameState,
    timestamp: u64,
    escrow: u64, // Bet amount in SUI.
    metadata: vector<u8>, // Arbitrary metadata (e.g., game settings).
    turn: u64, // Current turn number.
}

fun init(otw: GAME, ctx: &mut TxContext) {
    package::claim_and_keep(otw, ctx);

    let game_pool = GamePool {
        id: object::new(ctx),
        pool: vector[],
    };

    transfer::share_object(game_pool)
}


//TODO: continue here
public fun start_game(ctx: &mut TxContext) {
    let game = GameRequest {
        id: object::new(ctx),
        initiator: ctx.sender(),
        
    };

    transfer::share_object(game)
}