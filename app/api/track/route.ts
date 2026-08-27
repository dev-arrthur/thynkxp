import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
let client: MongoClient | null = null;
async function db(){if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI não configurada');client ??= new MongoClient(process.env.MONGODB_URI);await client.connect();return client.db(process.env.MONGODB_DB||'thynkxp');}
export async function POST(req: Request){try{const body=await req.json();if(body.consent!==true)return NextResponse.json({ok:false,error:'consent_required'},{status:400});const database=await db();await database.collection('analytics_events').insertOne({...body,createdAt:new Date()});return NextResponse.json({ok:true});}catch(e){console.error(e);return NextResponse.json({ok:false,error:'tracking_unavailable'},{status:500});}}