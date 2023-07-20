import { LLMChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { NextRequest, NextResponse } from 'next/server';
import { PromptTemplate } from 'langchain/prompts';

export const config = {
    runtime: 'edge',
};

export default async function POST(req: NextRequest) {
    try {
        const { q, customers_list } = await req.json();

        if (!q) {
            throw new Error('A query is required');
        }

        if (!customers_list) {
            throw new Error('Customers list is required');
        }

        const customerNamesString = customers_list.join('\n');

        const prompt = PromptTemplate.fromTemplate(
            `I have a database of customer names and I need a model that can accurately match a provided query to the best matching customer name. Given a query, the model should analyze the list of customer names and return the one that most closely matches the input. The model should account for potential misspellings, alternate spellings, and variations in name order (such as "Last, First" vs "First Last"). This needs to be an efficient process as the list could contain thousands of names.\nList of customers:\n{customerNamesString}\n\n Query: {q}\nBest match:`,
        );

        const model = new ChatOpenAI({ verbose: process.env.NODE_ENV === 'development' });
        const chain = new LLMChain({ llm: model, prompt, verbose: process.env.NODE_ENV === 'development' });
        const response = await chain.call({ q, customerNamesString });

        return NextResponse.json(
            {
                code: 200,
                response: response,
            },
            { status: 200 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                code: 400,
                error: error.message,
            },
            { status: 400 },
        );
    }
}
