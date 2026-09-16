import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAdminSessionFromRequest } from '../../../lib/admin-auth';
import { getDb } from '../../../lib/mongodb';

const ALLOWED_STATUS = new Set(['novo','qualificado','em_contato','proposta','negociacao','cliente','ativo','pausado','perdido']);
function clean(value: unknown,max=500){return typeof value==='string'?value.trim().slice(0,max):''}
function digits(value: unknown,max=30){return String(value||'').replace(/\D/g,'').slice(0,max)}
function normalizeStatus(value: unknown){const raw=clean(value,40).toLowerCase().replaceAll(' ','_');if(raw==='contato')return'em_contato';if(raw==='convertido')return'cliente';return ALLOWED_STATUS.has(raw)?raw:'novo'}
function numericValue(value: unknown,max=100_000_000){const parsed=typeof value==='number'?value:Number(String(value||'').replace(',','.'));return Number.isFinite(parsed)?Math.max(0,Math.min(parsed,max)):0}
function optionalDate(value: unknown){const raw=clean(value,80);if(!raw)return null;const parsed=new Date(raw);return Number.isNaN(parsed.getTime())?null:parsed}
function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return true;try{return new URL(origin).origin===new URL(req.url).origin}catch{return false}}
function emailIsValid(value:string){return!value||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
function buildContact(body:Record<string,unknown>){return{name:clean(body.name,120),email:clean(body.email,180).toLowerCase(),phone:clean(body.phone,40),company:clean(body.company,160),interest:clean(body.interest,160),source:clean(body.source,180)||'Cadastro manual',status:normalizeStatus(body.status),estimatedValue:numericValue(body.estimatedValue),nextActionAt:optionalDate(body.nextActionAt),notes:clean(body.notes,4000),owner:clean(body.owner,120)||'Arthur Ferreira',cnpj:digits(body.cnpj,14),address:clean(body.address,500),cnae:digits(body.cnae,7),cnaeDescription:clean(body.cnaeDescription,240),companySize:clean(body.companySize,100),capitalSocial:numericValue(body.capitalSocial,10_000_000_000),qualificationScore:numericValue(body.qualificationScore,100),externalSource:clean(body.externalSource,80),externalId:clean(body.externalId,180)}}
function noStore(payload:Record<string,unknown>,status=200){return NextResponse.json(payload,{status,headers:{'Cache-Control':'no-store, max-age=0'}})}
function activity(type:string,label:string,detail=''){return{type,label,detail:clean(detail,500),at:new Date()}}

export async function GET(req:Request){
  if(!(await getAdminSessionFromRequest(req)))return noStore({error:'unauthorized'},401);
  try{const database=await getDb();const leads=await database.collection('leads').find({}).sort({updatedAt:-1,createdAt:-1}).limit(500).toArray();return noStore({leads})}catch(error){console.error('Erro ao carregar contatos:',error instanceof Error?error.message:'unknown_error');return noStore({error:'leads_unavailable',leads:[]},503)}
}
export async function POST(req:Request){
  if(!(await getAdminSessionFromRequest(req)))return noStore({error:'unauthorized'},401);if(!sameOrigin(req))return noStore({error:'invalid_origin'},403);if(Number(req.headers.get('content-length')||0)>16_384)return noStore({error:'request_too_large'},413);
  try{const raw=await req.json();const body=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};const contact=buildContact(body);if(!contact.name&&!contact.company)return noStore({error:'name_or_company_required'},400);if(!emailIsValid(contact.email))return noStore({error:'invalid_email'},400);
    const database=await getDb();const leads=database.collection('leads');const checks:Record<string,unknown>[]=[];if(contact.email)checks.push({email:contact.email,anonymous:{$ne:true}});if(contact.cnpj)checks.push({cnpj:contact.cnpj,anonymous:{$ne:true}});if(contact.externalSource&&contact.externalId)checks.push({externalSource:contact.externalSource,externalId:contact.externalId,anonymous:{$ne:true}});if(checks.length&&await leads.findOne({$or:checks}))return noStore({error:'contact_already_exists'},409);
    const now=new Date();const result=await leads.insertOne({...contact,anonymous:false,leadType:contact.externalSource?'prospected':'identified',activity:[{type:'created',label:'Lead criado no CRM',detail:contact.source,at:now}],createdAt:now,updatedAt:now});const created=await leads.findOne({_id:result.insertedId});return noStore({ok:true,lead:created},201)
  }catch(error){console.error('Erro ao cadastrar contato:',error instanceof Error?error.message:'unknown_error');return noStore({error:'contact_create_failed'},503)}
}
export async function PATCH(req:Request){
  if(!(await getAdminSessionFromRequest(req)))return noStore({error:'unauthorized'},401);if(!sameOrigin(req))return noStore({error:'invalid_origin'},403);if(Number(req.headers.get('content-length')||0)>16_384)return noStore({error:'request_too_large'},413);
  try{const raw=await req.json();const body=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};const id=clean(body.id,80);if(!ObjectId.isValid(id))return noStore({error:'invalid_id'},400);const contact=buildContact(body);if(!contact.name&&!contact.company)return noStore({error:'name_or_company_required'},400);if(!emailIsValid(contact.email))return noStore({error:'invalid_email'},400);
    const database=await getDb();const collection=database.collection('leads');const _id=new ObjectId(id);const existing=await collection.findOne({_id});if(!existing)return noStore({error:'not_found'},404);const now=new Date();const previous=normalizeStatus(existing.status);const statusChanged=previous!==contact.status;
    const set:Record<string,unknown>={...contact,anonymous:false,updatedAt:now};const unset:Record<string,''>={};if(contact.status==='cliente'||contact.status==='ativo'){set.convertedAt=now;unset.lostAt=''}else if(contact.status==='perdido'){set.lostAt=now;unset.convertedAt=''}
    const entry=statusChanged?activity('status_changed',`Etapa alterada para ${contact.status.replaceAll('_',' ')}`,`Antes: ${previous.replaceAll('_',' ')}`):activity('updated','Dados comerciais atualizados',contact.owner?`Responsável: ${contact.owner}`:'');
    const update:Record<string,unknown>={$set:set,$push:{activity:{$each:[entry],$slice:-60}}};if(Object.keys(unset).length)update.$unset=unset;await collection.updateOne({_id},update);const updated=await collection.findOne({_id});return noStore({ok:true,lead:updated})
  }catch(error){console.error('Erro ao atualizar contato:',error instanceof Error?error.message:'unknown_error');return noStore({error:'contact_update_failed'},503)}
}
