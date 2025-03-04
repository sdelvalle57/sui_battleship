module battleship::battleship;

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

// A simple struct to represent grid positions (e.g., x and y coordinates).
public struct Coordinate has copy, drop, store {
    x: u8,
    y: u8,
}

public enum Orientation has store {
    Horizontal,
    Vertical,
}

// Define a ship with properties such as its type (e.g., destroyer, submarine), starting coordinate, 
// orientation (horizontal/vertical), size, and remaining health (or segments).
public struct Ship has store {
    start: Coordinate,
    orientation: Orientation,
    size: u8,
    hits: u8, // number of segments hit
}

// The board could be modeled as a mapping of coordinates to cell states (empty, hit, miss) or as a vector of cells. 
// You might also include a list of ships placed on the board.
public struct Board has store {
    // For simplicity, you might use a vector to represent grid cells,
    // or maintain a map from Coordinate to cell status.
    // Example with ships:
    ships: vector<Ship>,
    // You might also store past moves for replay or state verification.
}

// A resource representing a player in the game, which includes their board, moves made, and perhaps their Sui address.
public struct Player has store {
    addr: address,
    board: Board,
    moves: vector<Coordinate>,
}


public enum GameStatus has store {
    Ongoing,
    Finished,
}

// A central resource to manage the game session, track both players, whose turn it is, and whether the game is ongoing or finished.
public struct Game has store {
    player1: Player,
    player2: Player,
    current_turn: address,
    status: GameStatus,
}

// Define a function to initialize a new game session with two players and their boards.
public fun new_game(player1: Player, player2: Player): Game {
    Game {
        player1: player1,
        player2: player2,
        current_turn: player1.addr,
        status: GameStatus::Ongoing,
    }
}

