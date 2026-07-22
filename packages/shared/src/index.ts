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
    SpotifyTopStats,
    SpotifyAuthStatus,
    SpotifySyncResponse,
    SpotifyErrorResponse,
    TrackRepository,
} from './spotify.types';

// Lyrics types
export {
    LYRICS_STATUSES,
    LYRICS_INTERPRETATION_EVENT_TYPES,
    LYRICS_CANVAS_ERROR_CODES,
} from './lyrics.types';
export type {
    LyricsStatus,
    Lyrics,
    LyricsStats,
    LyricsLibraryTrack,
    LyricsBatchResponse,
    LyricsErrorResponse,
    LyricsInterpretationEvent,
    LyricsCanvasErrorCode,
    LyricsCanvasSource,
    LyricsCanvasNeedsAnalysisResponse,
    LyricsCanvasLoadResponse,
    LyricsCanvasErrorResponse,
} from './lyrics.types';

// Trading types
export { TRADING_KLINE_INTERVALS } from './trading.types';
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
    TradingKlineInterval,
    TradingPreviousInsight,
    TradingWizardInsightRequest,
    TradingWizardAnalysis,
    TradingWizardInsightMeta,
    TradingStatusResponse,
    TradingStateResponse,
    TradingCandlesResponse,
    TradingKlinesResponse,
    TradingLiveCandleResponse,
    TradingFractalsResponse,
    TradingAdvisorToggleResponse,
    TradingAdvisorStatusResponse,
    TradingInsightResponse,
    TradingGeneratedInsightResponse,
    TradingWizardInsightResponse,
    TradingErrorResponse,
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
    ChatSendResponse,
    ChatDeleteResponse,
    ChatErrorResponse,
    ChatStreamEvent,
} from './chat.types';
export { CHAT_MODES, CHAT_STREAM_EVENT_TYPES } from './chat.types';

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

// Board persistence contracts
export { BOARD_ITEM_SIZES, BOARD_LAYOUT_VERSION } from './board.types';
export type {
    Board,
    BoardItem,
    BoardItemSize,
    BoardLayoutVersion,
    BoardsSnapshot,
    BoardCreateRequest,
    BoardRenameRequest,
    BoardLayoutUpdateRequest,
    BoardErrorResponse,
} from './board.types';
