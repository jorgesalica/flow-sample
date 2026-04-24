/**
 * @flows/shared — Shared Domain Types
 * Used by backend, UI, and all flow packages.
 */

// Spotify types
export type {
    Artist,
    Album,
    Track,
    GenreCount,
    YearCount,
} from './spotify.types';

// Lyrics types
export type {
    LyricsStatus,
    Lyrics,
    LyricsStats,
} from './lyrics.types';

// Trading types
export type {
    Candle,
    FractalNode,
    RegimeType,
    CandlePatternInfo,
    MarketState,
    SentimentBias,
    RiskManagement,
    AdvisorNote,
    TradingState,
    AdvisorState,
} from './trading.types';

// Common types
export type {
    StatusTone,
    StatusMessage,
    SearchOptions,
    PaginatedResult,
    SelectOption,
    YearRange,
} from './common.types';

// Chat types
export type {
    ChatConversation,
    ChatMessage,
    ChatProviderOption,
    ChatModelCatalogEntry,
    ChatProviderGroup,
    ChatMode,
    ChatRequest,
} from './chat.types';

// Canvas types (Generic)
export type {
    Token,
    Section,
    TokenAST,
    Annotation,
    AnnotationLayer,
    CanvasSourceType,
    CanvasSource,
    CanvasAnalysis,
} from './canvas.types';

// Canvas types (Musical)
export type {
    ChordAnnotation,
    VocalAnnotation,
    ProductionAnnotation,
    MusicAnnotation,
    SongMeta,
} from './canvas-music.types';
export { MUSIC_LAYERS } from './canvas-music.types';

