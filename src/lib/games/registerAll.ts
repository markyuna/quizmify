// Side-effect-only import aggregator: each game module calls
// registerGuestGame() at its own module top level, so importing it here is
// enough to make that game reachable through guestPlay.ts's registry.
//
// Deliberately not imported *from* guestPlay.ts itself -- that would make
// guestPlay.ts (registerGuestGame's home) and e.g. wordOfDay.ts (a caller
// of registerGuestGame) import each other, and whichever side's module
// body runs first would call into a `registry` that hasn't been
// initialized yet. Every route that touches the guest game registry
// imports this file instead, so the registration side effects run before
// any lookup does, with no cycle.
import "@/lib/games/wordOfDay";
import "@/lib/games/photoOfDay";
import "@/lib/games/mathTarget";
