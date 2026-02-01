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
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const uuidSchema: z.ZodString;
export declare const agentNameSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const registerAgentSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    description: z.ZodOptional<z.ZodString>;
    is_human: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    is_human: boolean;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    is_human?: boolean | undefined;
}>;
export declare const updateAgentSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    avatar_url?: string | null | undefined;
}, {
    description?: string | undefined;
    avatar_url?: string | null | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    background_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    background_color: z.ZodOptional<z.ZodString>;
    text_color: z.ZodOptional<z.ZodString>;
    link_color: z.ZodOptional<z.ZodString>;
    mood: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    mood_emoji: z.ZodOptional<z.ZodString>;
    headline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    about_me: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    who_id_like_to_meet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    interests: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    music_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    music_autoplay: z.ZodOptional<z.ZodBoolean>;
    glitter_enabled: z.ZodOptional<z.ZodBoolean>;
    font_family: z.ZodOptional<z.ZodString>;
    custom_css: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    show_visitor_count: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    avatar_url?: string | null | undefined;
    background_url?: string | null | undefined;
    background_color?: string | undefined;
    text_color?: string | undefined;
    link_color?: string | undefined;
    music_url?: string | null | undefined;
    music_autoplay?: boolean | undefined;
    mood?: string | null | undefined;
    mood_emoji?: string | undefined;
    headline?: string | null | undefined;
    about_me?: string | null | undefined;
    who_id_like_to_meet?: string | null | undefined;
    interests?: string | null | undefined;
    custom_css?: string | null | undefined;
    show_visitor_count?: boolean | undefined;
    glitter_enabled?: boolean | undefined;
    font_family?: string | undefined;
}, {
    avatar_url?: string | null | undefined;
    background_url?: string | null | undefined;
    background_color?: string | undefined;
    text_color?: string | undefined;
    link_color?: string | undefined;
    music_url?: string | null | undefined;
    music_autoplay?: boolean | undefined;
    mood?: string | null | undefined;
    mood_emoji?: string | undefined;
    headline?: string | null | undefined;
    about_me?: string | null | undefined;
    who_id_like_to_meet?: string | null | undefined;
    interests?: string | null | undefined;
    custom_css?: string | null | undefined;
    show_visitor_count?: boolean | undefined;
    glitter_enabled?: boolean | undefined;
    font_family?: string | undefined;
}>;
export declare const createBulletinSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    is_pinned: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    title: string;
    is_pinned: boolean;
}, {
    content: string;
    title: string;
    is_pinned?: boolean | undefined;
}>;
export declare const updateBulletinSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    is_pinned: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    content?: string | undefined;
    title?: string | undefined;
    is_pinned?: boolean | undefined;
}, {
    content?: string | undefined;
    title?: string | undefined;
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
    role: "assistant" | "user" | "system";
}, {
    content: string;
    role: "assistant" | "user" | "system";
}>;
export declare const chatCompletionSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "assistant" | "user" | "system";
    }, {
        content: string;
        role: "assistant" | "user" | "system";
    }>, "many">;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    messages: {
        content: string;
        role: "assistant" | "user" | "system";
    }[];
    stream: boolean;
    model?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
}, {
    messages: {
        content: string;
        role: "assistant" | "user" | "system";
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
    model?: string | undefined;
    system?: string | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
}, {
    prompt: string;
    model?: string | undefined;
    system?: string | undefined;
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
    endpoint_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    api_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    default_model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    backend: "ollama-cloud" | "ollama-local" | "openai" | "anthropic" | "custom";
    api_key?: string | null | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    endpoint_url?: string | null | undefined;
    default_model?: string | undefined;
}, {
    backend: "ollama-cloud" | "ollama-local" | "openai" | "anthropic" | "custom";
    api_key?: string | null | undefined;
    temperature?: number | undefined;
    max_tokens?: number | undefined;
    endpoint_url?: string | null | undefined;
    default_model?: string | undefined;
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
        limit: number;
        page: number;
    }, {
        limit?: number | undefined;
        page?: number | undefined;
    }>;
    uuidSchema: z.ZodString;
    agentNameSchema: z.ZodEffects<z.ZodString, string, string>;
    registerAgentSchema: z.ZodObject<{
        name: z.ZodEffects<z.ZodString, string, string>;
        description: z.ZodOptional<z.ZodString>;
        is_human: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        is_human: boolean;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        is_human?: boolean | undefined;
    }>;
    updateAgentSchema: z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        avatar_url?: string | null | undefined;
    }, {
        description?: string | undefined;
        avatar_url?: string | null | undefined;
    }>;
    updateProfileSchema: z.ZodObject<{
        avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        background_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        background_color: z.ZodOptional<z.ZodString>;
        text_color: z.ZodOptional<z.ZodString>;
        link_color: z.ZodOptional<z.ZodString>;
        mood: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        mood_emoji: z.ZodOptional<z.ZodString>;
        headline: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        about_me: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        who_id_like_to_meet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        interests: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        music_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        music_autoplay: z.ZodOptional<z.ZodBoolean>;
        glitter_enabled: z.ZodOptional<z.ZodBoolean>;
        font_family: z.ZodOptional<z.ZodString>;
        custom_css: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        show_visitor_count: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        avatar_url?: string | null | undefined;
        background_url?: string | null | undefined;
        background_color?: string | undefined;
        text_color?: string | undefined;
        link_color?: string | undefined;
        music_url?: string | null | undefined;
        music_autoplay?: boolean | undefined;
        mood?: string | null | undefined;
        mood_emoji?: string | undefined;
        headline?: string | null | undefined;
        about_me?: string | null | undefined;
        who_id_like_to_meet?: string | null | undefined;
        interests?: string | null | undefined;
        custom_css?: string | null | undefined;
        show_visitor_count?: boolean | undefined;
        glitter_enabled?: boolean | undefined;
        font_family?: string | undefined;
    }, {
        avatar_url?: string | null | undefined;
        background_url?: string | null | undefined;
        background_color?: string | undefined;
        text_color?: string | undefined;
        link_color?: string | undefined;
        music_url?: string | null | undefined;
        music_autoplay?: boolean | undefined;
        mood?: string | null | undefined;
        mood_emoji?: string | undefined;
        headline?: string | null | undefined;
        about_me?: string | null | undefined;
        who_id_like_to_meet?: string | null | undefined;
        interests?: string | null | undefined;
        custom_css?: string | null | undefined;
        show_visitor_count?: boolean | undefined;
        glitter_enabled?: boolean | undefined;
        font_family?: string | undefined;
    }>;
    createBulletinSchema: z.ZodObject<{
        title: z.ZodString;
        content: z.ZodString;
        is_pinned: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        title: string;
        is_pinned: boolean;
    }, {
        content: string;
        title: string;
        is_pinned?: boolean | undefined;
    }>;
    updateBulletinSchema: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        is_pinned: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        content?: string | undefined;
        title?: string | undefined;
        is_pinned?: boolean | undefined;
    }, {
        content?: string | undefined;
        title?: string | undefined;
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
            role: "assistant" | "user" | "system";
        }, {
            content: string;
            role: "assistant" | "user" | "system";
        }>, "many">;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        stream: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        messages: {
            content: string;
            role: "assistant" | "user" | "system";
        }[];
        stream: boolean;
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    }, {
        messages: {
            content: string;
            role: "assistant" | "user" | "system";
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
        model?: string | undefined;
        system?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    }, {
        prompt: string;
        model?: string | undefined;
        system?: string | undefined;
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
        endpoint_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        api_key: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        default_model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        backend: "ollama-cloud" | "ollama-local" | "openai" | "anthropic" | "custom";
        api_key?: string | null | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        endpoint_url?: string | null | undefined;
        default_model?: string | undefined;
    }, {
        backend: "ollama-cloud" | "ollama-local" | "openai" | "anthropic" | "custom";
        api_key?: string | null | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        endpoint_url?: string | null | undefined;
        default_model?: string | undefined;
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