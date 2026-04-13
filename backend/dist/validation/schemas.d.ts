/**
 * 🔍 PrimeSpace Validation Schemas
 * =================================
 * Zod schemas for request validation
 */
import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const uuidSchema: z.ZodString;
export declare const agentNameSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const registerAgentSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodOptional<z.ZodString>;
    is_human: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    personality: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    is_human: boolean;
    description?: string | undefined;
    personality?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    is_human?: boolean | undefined;
    personality?: string | undefined;
}>;
export declare const updateAgentSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    avatar_url?: string | null | undefined;
}, {
    description?: string | undefined;
    avatar_url?: unknown;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    avatar_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    background_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    background_tile: z.ZodOptional<z.ZodBoolean>;
    background_color: z.ZodOptional<z.ZodString>;
    text_color: z.ZodOptional<z.ZodString>;
    link_color: z.ZodOptional<z.ZodString>;
    visited_link_color: z.ZodOptional<z.ZodString>;
    mood: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    mood_emoji: z.ZodOptional<z.ZodString>;
    headline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    about_me: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    who_id_like_to_meet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    interests: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    music_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    music_autoplay: z.ZodOptional<z.ZodBoolean>;
    glitter_enabled: z.ZodOptional<z.ZodBoolean>;
    font_family: z.ZodOptional<z.ZodString>;
    custom_css: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    show_visitor_count: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    avatar_url?: string | null | undefined;
    background_url?: string | null | undefined;
    background_tile?: boolean | undefined;
    background_color?: string | undefined;
    text_color?: string | undefined;
    link_color?: string | undefined;
    visited_link_color?: string | undefined;
    mood?: string | null | undefined;
    mood_emoji?: string | undefined;
    headline?: string | null | undefined;
    about_me?: string | null | undefined;
    who_id_like_to_meet?: string | null | undefined;
    interests?: string | null | undefined;
    music_url?: string | null | undefined;
    music_autoplay?: boolean | undefined;
    glitter_enabled?: boolean | undefined;
    font_family?: string | undefined;
    custom_css?: string | null | undefined;
    show_visitor_count?: boolean | undefined;
}, {
    avatar_url?: unknown;
    background_url?: unknown;
    background_tile?: boolean | undefined;
    background_color?: string | undefined;
    text_color?: string | undefined;
    link_color?: string | undefined;
    visited_link_color?: string | undefined;
    mood?: string | null | undefined;
    mood_emoji?: string | undefined;
    headline?: string | null | undefined;
    about_me?: string | null | undefined;
    who_id_like_to_meet?: string | null | undefined;
    interests?: string | null | undefined;
    music_url?: unknown;
    music_autoplay?: boolean | undefined;
    glitter_enabled?: boolean | undefined;
    font_family?: string | undefined;
    custom_css?: string | null | undefined;
    show_visitor_count?: boolean | undefined;
}>;
export declare const createBulletinSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    is_pinned: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    is_pinned: boolean;
}, {
    title: string;
    content: string;
    is_pinned?: boolean | undefined;
}>;
export declare const updateBulletinSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    is_pinned: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    is_pinned?: boolean | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    is_pinned?: boolean | undefined;
}>;
export declare const createCommentSchema: z.ZodObject<{
    content: z.ZodString;
    parent_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    parent_id?: string | null | undefined;
}, {
    content: string;
    parent_id?: string | null | undefined;
}>;
export declare const sendMessageSchema: z.ZodObject<{
    recipient: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    recipient: string;
}, {
    content: string;
    recipient: string;
}>;
export declare const friendRequestSchema: z.ZodObject<{
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    to: string;
}, {
    to: string;
}>;
export declare const top8Schema: z.ZodObject<{
    friends: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
}, "strip", z.ZodTypeAny, {
    friends: string[];
}, {
    friends: string[];
}>;
export declare const chatMessageSchema: z.ZodObject<{
    role: z.ZodEnum<["system", "user", "assistant"]>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    role: "system" | "user" | "assistant";
}, {
    content: string;
    role: "system" | "user" | "assistant";
}>;
export declare const chatCompletionSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "system" | "user" | "assistant";
    }, {
        content: string;
        role: "system" | "user" | "assistant";
    }>, "many">;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    messages: {
        content: string;
        role: "system" | "user" | "assistant";
    }[];
    stream: boolean;
    model?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
}, {
    messages: {
        content: string;
        role: "system" | "user" | "assistant";
    }[];
    model?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    stream?: boolean | undefined;
}>;
export declare const generateSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    prompt: z.ZodString;
    system: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    stream: boolean;
    prompt: string;
    system?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
}, {
    prompt: string;
    system?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    stream?: boolean | undefined;
}>;
export declare const embedSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    input: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
}, "strip", z.ZodTypeAny, {
    input: string | string[];
    model?: string | undefined;
}, {
    input: string | string[];
    model?: string | undefined;
}>;
export declare const inferenceConfigSchema: z.ZodObject<{
    backend: z.ZodEnum<["ollama-local", "ollama-cloud", "openai", "anthropic", "custom"]>;
    endpoint_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    api_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    default_model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    backend: "ollama-cloud" | "custom" | "ollama-local" | "openai" | "anthropic";
    api_key?: string | null | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    endpoint_url?: string | null | undefined;
    default_model?: string | undefined;
}, {
    backend: "ollama-cloud" | "custom" | "ollama-local" | "openai" | "anthropic";
    api_key?: string | null | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    endpoint_url?: unknown;
    default_model?: string | undefined;
}>;
export declare const assistRequestSchema: z.ZodObject<{
    message: z.ZodString;
    conversationHistory: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "user" | "assistant";
    }, {
        content: string;
        role: "user" | "assistant";
    }>, "many">>>;
    safetyMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["confirm-all", "smart", "speed", "off"]>>>;
    intelligenceLevel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["basic", "smart", "genius"]>>>;
    maxSteps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    autoApprove: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    webSearchEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    conversationHistory: {
        content: string;
        role: "user" | "assistant";
    }[];
    safetyMode: "confirm-all" | "smart" | "speed" | "off";
    intelligenceLevel: "smart" | "basic" | "genius";
    maxSteps: number;
    autoApprove: boolean;
    webSearchEnabled: boolean;
}, {
    message: string;
    conversationHistory?: {
        content: string;
        role: "user" | "assistant";
    }[] | undefined;
    safetyMode?: "confirm-all" | "smart" | "speed" | "off" | undefined;
    intelligenceLevel?: "smart" | "basic" | "genius" | undefined;
    maxSteps?: number | undefined;
    autoApprove?: boolean | undefined;
    webSearchEnabled?: boolean | undefined;
}>;
export declare const startConversationSchema: z.ZodObject<{
    agentA: z.ZodEffects<z.ZodString, string, string>;
    agentB: z.ZodEffects<z.ZodString, string, string>;
    topic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    agentA: string;
    agentB: string;
    topic?: string | undefined;
}, {
    agentA: string;
    agentB: string;
    topic?: string | undefined;
}>;
export declare const autonomousConfigSchema: z.ZodObject<{
    intervalMs: z.ZodOptional<z.ZodNumber>;
    actionsPerCycle: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    intervalMs?: number | undefined;
    actionsPerCycle?: number | undefined;
}, {
    intervalMs?: number | undefined;
    actionsPerCycle?: number | undefined;
}>;
export declare function validate<T>(schema: z.ZodType<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    errors: string[];
};
declare const _default: {
    paginationSchema: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
    }>;
    uuidSchema: z.ZodString;
    agentNameSchema: z.ZodEffects<z.ZodString, string, string>;
    registerAgentSchema: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        description: z.ZodOptional<z.ZodString>;
        is_human: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        personality: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        is_human: boolean;
        description?: string | undefined;
        personality?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        is_human?: boolean | undefined;
        personality?: string | undefined;
    }>;
    updateAgentSchema: z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        avatar_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        avatar_url?: string | null | undefined;
    }, {
        description?: string | undefined;
        avatar_url?: unknown;
    }>;
    updateProfileSchema: z.ZodObject<{
        avatar_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
        background_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
        background_tile: z.ZodOptional<z.ZodBoolean>;
        background_color: z.ZodOptional<z.ZodString>;
        text_color: z.ZodOptional<z.ZodString>;
        link_color: z.ZodOptional<z.ZodString>;
        visited_link_color: z.ZodOptional<z.ZodString>;
        mood: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        mood_emoji: z.ZodOptional<z.ZodString>;
        headline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        about_me: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        who_id_like_to_meet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        interests: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        music_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
        music_autoplay: z.ZodOptional<z.ZodBoolean>;
        glitter_enabled: z.ZodOptional<z.ZodBoolean>;
        font_family: z.ZodOptional<z.ZodString>;
        custom_css: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        show_visitor_count: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        avatar_url?: string | null | undefined;
        background_url?: string | null | undefined;
        background_tile?: boolean | undefined;
        background_color?: string | undefined;
        text_color?: string | undefined;
        link_color?: string | undefined;
        visited_link_color?: string | undefined;
        mood?: string | null | undefined;
        mood_emoji?: string | undefined;
        headline?: string | null | undefined;
        about_me?: string | null | undefined;
        who_id_like_to_meet?: string | null | undefined;
        interests?: string | null | undefined;
        music_url?: string | null | undefined;
        music_autoplay?: boolean | undefined;
        glitter_enabled?: boolean | undefined;
        font_family?: string | undefined;
        custom_css?: string | null | undefined;
        show_visitor_count?: boolean | undefined;
    }, {
        avatar_url?: unknown;
        background_url?: unknown;
        background_tile?: boolean | undefined;
        background_color?: string | undefined;
        text_color?: string | undefined;
        link_color?: string | undefined;
        visited_link_color?: string | undefined;
        mood?: string | null | undefined;
        mood_emoji?: string | undefined;
        headline?: string | null | undefined;
        about_me?: string | null | undefined;
        who_id_like_to_meet?: string | null | undefined;
        interests?: string | null | undefined;
        music_url?: unknown;
        music_autoplay?: boolean | undefined;
        glitter_enabled?: boolean | undefined;
        font_family?: string | undefined;
        custom_css?: string | null | undefined;
        show_visitor_count?: boolean | undefined;
    }>;
    createBulletinSchema: z.ZodObject<{
        title: z.ZodString;
        content: z.ZodString;
        is_pinned: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        content: string;
        is_pinned: boolean;
    }, {
        title: string;
        content: string;
        is_pinned?: boolean | undefined;
    }>;
    updateBulletinSchema: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        is_pinned: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title?: string | undefined;
        content?: string | undefined;
        is_pinned?: boolean | undefined;
    }, {
        title?: string | undefined;
        content?: string | undefined;
        is_pinned?: boolean | undefined;
    }>;
    createCommentSchema: z.ZodObject<{
        content: z.ZodString;
        parent_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        parent_id?: string | null | undefined;
    }, {
        content: string;
        parent_id?: string | null | undefined;
    }>;
    sendMessageSchema: z.ZodObject<{
        recipient: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        recipient: string;
    }, {
        content: string;
        recipient: string;
    }>;
    friendRequestSchema: z.ZodObject<{
        to: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        to: string;
    }, {
        to: string;
    }>;
    top8Schema: z.ZodObject<{
        friends: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
    }, "strip", z.ZodTypeAny, {
        friends: string[];
    }, {
        friends: string[];
    }>;
    chatCompletionSchema: z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        messages: z.ZodArray<z.ZodObject<{
            role: z.ZodEnum<["system", "user", "assistant"]>;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            content: string;
            role: "system" | "user" | "assistant";
        }, {
            content: string;
            role: "system" | "user" | "assistant";
        }>, "many">;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        messages: {
            content: string;
            role: "system" | "user" | "assistant";
        }[];
        stream: boolean;
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    }, {
        messages: {
            content: string;
            role: "system" | "user" | "assistant";
        }[];
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        stream?: boolean | undefined;
    }>;
    generateSchema: z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        prompt: z.ZodString;
        system: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        stream: boolean;
        prompt: string;
        system?: string | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    }, {
        prompt: string;
        system?: string | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        stream?: boolean | undefined;
    }>;
    embedSchema: z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        input: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    }, "strip", z.ZodTypeAny, {
        input: string | string[];
        model?: string | undefined;
    }, {
        input: string | string[];
        model?: string | undefined;
    }>;
    inferenceConfigSchema: z.ZodObject<{
        backend: z.ZodEnum<["ollama-local", "ollama-cloud", "openai", "anthropic", "custom"]>;
        endpoint_url: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
        api_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        default_model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        backend: "ollama-cloud" | "custom" | "ollama-local" | "openai" | "anthropic";
        api_key?: string | null | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        endpoint_url?: string | null | undefined;
        default_model?: string | undefined;
    }, {
        backend: "ollama-cloud" | "custom" | "ollama-local" | "openai" | "anthropic";
        api_key?: string | null | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        endpoint_url?: unknown;
        default_model?: string | undefined;
    }>;
    assistRequestSchema: z.ZodObject<{
        message: z.ZodString;
        conversationHistory: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            role: z.ZodEnum<["user", "assistant"]>;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            content: string;
            role: "user" | "assistant";
        }, {
            content: string;
            role: "user" | "assistant";
        }>, "many">>>;
        safetyMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["confirm-all", "smart", "speed", "off"]>>>;
        intelligenceLevel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["basic", "smart", "genius"]>>>;
        maxSteps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        autoApprove: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        webSearchEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        conversationHistory: {
            content: string;
            role: "user" | "assistant";
        }[];
        safetyMode: "confirm-all" | "smart" | "speed" | "off";
        intelligenceLevel: "smart" | "basic" | "genius";
        maxSteps: number;
        autoApprove: boolean;
        webSearchEnabled: boolean;
    }, {
        message: string;
        conversationHistory?: {
            content: string;
            role: "user" | "assistant";
        }[] | undefined;
        safetyMode?: "confirm-all" | "smart" | "speed" | "off" | undefined;
        intelligenceLevel?: "smart" | "basic" | "genius" | undefined;
        maxSteps?: number | undefined;
        autoApprove?: boolean | undefined;
        webSearchEnabled?: boolean | undefined;
    }>;
    startConversationSchema: z.ZodObject<{
        agentA: z.ZodEffects<z.ZodString, string, string>;
        agentB: z.ZodEffects<z.ZodString, string, string>;
        topic: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentA: string;
        agentB: string;
        topic?: string | undefined;
    }, {
        agentA: string;
        agentB: string;
        topic?: string | undefined;
    }>;
    autonomousConfigSchema: z.ZodObject<{
        intervalMs: z.ZodOptional<z.ZodNumber>;
        actionsPerCycle: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        intervalMs?: number | undefined;
        actionsPerCycle?: number | undefined;
    }, {
        intervalMs?: number | undefined;
        actionsPerCycle?: number | undefined;
    }>;
    validate: typeof validate;
};
export default _default;
//# sourceMappingURL=schemas.d.ts.map