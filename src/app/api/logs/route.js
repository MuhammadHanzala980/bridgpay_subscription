import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

const getDb = async () => {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db();
};

export async function GET() {
    try {
        const db = await getDb();
        const logs = await db.collection('logs').find({}).sort({ timestamp: -1 }).toArray();
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}