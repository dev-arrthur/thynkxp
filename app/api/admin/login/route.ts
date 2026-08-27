import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
const cookie='thynkxp_admin_session';
function sign(v:string){return crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET||process.env.ADMIN_BOOTSTRAP_SECRET||'change-me').update(v).digest('hex');}
export async function POST(req:Request){const {email,password}=await req.json();if(email!==process.env.ADMIN_EMAIL||password!==process.env.ADMIN_BOOTSTRAP_SECRET)return NextResponse.json({ok:false,error:'invalid_credentials'},{status:401});const value=`${email}.${Date.now()}.${crypto.randomUUID()}`;const token=`${value}.${sign(value)}`;const r=NextResponse.json({ok:true});r.cookies.set(cookie,token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:60*60*12});return r;}
export async function DELETE(){const r=NextResponse.json({ok:true});r.cookies.delete(cookie);return r;}