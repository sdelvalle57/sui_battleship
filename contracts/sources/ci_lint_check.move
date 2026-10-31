// Copyright (c) 2025-2026 sdelvalle57
// SPDX-License-Identifier: Apache-2.0

/// Rojo provocado de CI (#3): dispara WSL06010 (prefer_mut_tx_context) sin warnings de compilación. Nunca se mergea.
module battleship::ci_lint_check;

public fun touch(_ctx: &TxContext) {}
