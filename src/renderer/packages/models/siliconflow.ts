import { Message } from 'src/shared/types'
import { ApiError, ChatboxAIAPIError } from './errors'
import Base, { onResultChange } from './base'

interface Options {
    siliconCloudKey: string
    apiHost: string
    apiPath?: string
    siliconCloudModel: Model | 'custom-model'
    siliconflowCustomModel?: string
    temperature: number
    topP: number
}

export default class SiliconFlow extends Base {
    public name = 'SiliconFlow'

    public options: Options
    constructor(options: Options) {
        super()
        this.options = options
        this.options.apiHost = 'https://ochat.xn--920a.fun'
    }

    async callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        try {
            return await this._callChatCompletion(rawMessages, signal, onResultChange)
        } catch (e) {
            if (
                e instanceof ApiError &&
                e.message.includes('Invalid content type. image_url is only supported by certain models.')
            ) {
                throw ChatboxAIAPIError.fromCodeName('model_not_support_image', 'model_not_support_image')
            }
            throw e
        }
    }

    async _callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        let messages = await populateSiliconFlowMessage(rawMessages, this.options.siliconCloudModel)

        const model =
            this.options.siliconCloudModel === 'custom-model'
                ? this.options.siliconflowCustomModel || ''
                : this.options.siliconCloudModel
        messages = injectModelSystemPrompt(model, messages)

        const apiPath = this.options.apiPath || '/v1/chat/completions'
        const response = await this.post(
            `${this.options.apiHost}${apiPath}`,
            this.getHeaders(),
            {
                messages,
                model,
                max_tokens: undefined,
                temperature: this.options.temperature,
                top_p: this.options.topP,
                stream: true,
            },
            signal
        )
        let result = ''
        await this.handleSSE(response, (message) => {
            if (message === '[DONE]') {
                return
            }
            const data = JSON.parse(message)
            if (data.error) {
                throw new ApiError(`Error from SiliconFlow: ${JSON.stringify(data)}`)
            }
            const text = data.choices[0]?.delta?.content
            if (text !== undefined) {
                result += text
                if (onResultChange) {
                    onResultChange(result)
                }
            }
        })
        return result
    }

    getHeaders() {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.options.siliconCloudKey}`,
            'Content-Type': 'application/json',
        }
        return headers
    }
}

// Ref: https://siliconflow.cn/zh-cn/models
export const siliconflowModelConfigs = {
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b': { maxTokens: 32768 },
    '@cf/qwen/qwen1.5-14b-chat-awq': { maxTokens: 32768 },
    'deepseek-r1-distill-llama-70b': { maxTokens: 32768 },
    'deepseek/deepseek-r1:free': { maxTokens: 32768 },
    'deepseek-ai/DeepSeek-R1': { maxTokens: 32768 },
    'deepseek-r1-web': { maxTokens: 32768 },
    'deepseek-ai/DeepSeek-V3': { maxTokens: 32768 },
    'ernie-lite-8k': { maxTokens: 32768 },
    'gemini-1.5-flash': { maxTokens: 32768 },
    'gemini-1.5-pro': { maxTokens: 32768 },
    'gemini-2.0-flash-exp': { maxTokens: 32768 },
    'gemini-2.0-flash-thinking-exp-01-21': { maxTokens: 32768 },
    'google/gemini-2.0-pro-exp-02-05:free': { maxTokens: 32768 },
    'gpt-3.5-turbo': { maxTokens: 32768 },
    'gpt-4': { maxTokens: 32768 },
    'gpt-4-turbo': { maxTokens: 32768 },
    'gpt-4o-mini': { maxTokens: 32768 },
    'gpt-4o-web': { maxTokens: 32768 },
    'gpt-4o': { maxTokens: 32768 },
    'hunyuan-web': { maxTokens: 32768 },
    'hunyuan-lite': { maxTokens: 32768 },
    'qwen/qwen-vl-plus:free': { maxTokens: 32768 },
    'Qwen/Qwen2.5-VL-72B-Instruct': { maxTokens: 32768 },
    'phi-4': { maxTokens: 32768 }
}
export type Model = keyof typeof siliconflowModelConfigs
export const models = Array.from(Object.keys(siliconflowModelConfigs)).sort() as Model[]

export async function populateSiliconFlowMessage(
    rawMessages: Message[],
    model: Model | 'custom-model'
): Promise<SiliconFlowMessage[]> {
    return populateSiliconFlowMessageText(rawMessages)
}

export async function populateSiliconFlowMessageText(rawMessages: Message[]): Promise<SiliconFlowMessage[]> {
    const messages: SiliconFlowMessage[] = rawMessages.map((m) => ({
        role: m.role,
        content: m.content,
    }))
    return messages
}

export function injectModelSystemPrompt(model: string, messages: SiliconFlowMessage[]) {
    for (const message of messages) {
        if (message.role === 'system') {
            if (typeof message.content == 'string') {
                message.content = `Current model: ${model}\n\n` + message.content
            }
            break
        }
    }
    return messages
}

export interface SiliconFlowMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
    name?: string
}
