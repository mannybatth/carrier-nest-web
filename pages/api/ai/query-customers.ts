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
            `I'm working with a database of company names and need a sophisticated AI model capable of accurately identifying the closest match for a provided query. The query will represent a full or partial company name, and the model is required to return the exact or nearly exact company name from the database that corresponds to this input. It's essential that the comparison focuses on identifying exact matches, while it should consider minor spelling variations or extra/missing spaces. The model must effectively disregard common, industry-related terms such as "logistics", "group", and "llc" during the matching process. Given the database could contain thousands of company names, efficiency is paramount. If the input query doesn't closely match any company in the database, the model should return a null value, thereby avoiding potential false positives.\nList of customers:\n{customerNamesString}\n\n Query: {q}\nBest match:`,
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
