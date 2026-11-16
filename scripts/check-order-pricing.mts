// Checks the server's order price validation against the real catalogue (READS ONLY, writes nothing).
// Run:  node --import ./scripts/alias-register.mjs scripts/check-order-pricing.mts
import fs from 'node:fs'
import { createRequire } from 'node:module'
const { createClient } = createRequire(import.meta.url)('@supabase/supabase-js')
const env:any={};fs.readFileSync(new URL('../.env.local', import.meta.url),'utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^"|"$/g,'')})
process.env.NEXT_PUBLIC_SUPABASE_URL=env.NEXT_PUBLIC_SUPABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const { priceOrder } = await import('../src/lib/order-pricing.ts')
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)   // READS ONLY below
const P=(await db.from('products').select('id,name,design_pricing_type,design_flat_fee').eq('is_active',true)).data
const bc=P.find((p:any)=>/Business Card Printing/.test(p.name)),ig=P.find((p:any)=>/Instagram/.test(p.name))
const del=(await db.from('delivery_settings').select('id,price,name').eq('is_active',true).eq('type','local').limit(1)).data[0]
const bcSpecs={Quantity:'100',Lamination:'Matte',Finishing:'Sharp Edge','Paper Weight':'300gsm (Standard)','Print Side':'Front','Paper Type':'Paper Card'}
const run=async(label:string,body:any,expectOk:boolean)=>{const r:any=await priceOrder(db,body);const good=r.ok===expectOk;console.log((good?'PASS':'FAIL'),label,'->',r.ok?`ok total ₦${r.total} (lines ${r.linePrices})`:`rejected ${r.error} ${JSON.stringify(r.lines?.map((l:any)=>({claimed:l.claimed,expected:l.expected,problem:l.problem}))||r.detail||'')}`);return good}
let all=true
all=await run('honest business card (browser price 13,975)',{items:[{productId:bc.id,name:bc.name,price:13975,specs:bcSpecs}],total:13975},true)&&all
all=await run('TAMPERED business card price ₦100',{items:[{productId:bc.id,name:bc.name,price:100,specs:bcSpecs}],total:100},false)&&all
all=await run('price off by ₦1 is tolerated',{items:[{productId:bc.id,name:bc.name,price:13976,specs:bcSpecs}],total:13976},true)&&all
all=await run('price off by ₦2 is rejected',{items:[{productId:bc.id,name:bc.name,price:13977,specs:bcSpecs}],total:13977},false)&&all
all=await run('fixed-price Instagram board at its stored price ₦15,000',{items:[{productId:ig.id,name:ig.name,price:15000,specs:{Quantity:'1'}}],total:15000},true)&&all
all=await run('fixed-price Instagram board TAMPERED to ₦4 (the old calculator price)',{items:[{productId:ig.id,name:ig.name,price:4,specs:{Quantity:'1'}}],total:4},false)&&all
all=await run('fixed-price Instagram board x3 = ₦45,000',{items:[{productId:ig.id,name:ig.name,price:45000,specs:{Quantity:'3'}}],total:45000},true)&&all
all=await run('with delivery fee from the table',{items:[{productId:bc.id,name:bc.name,price:13975,specs:bcSpecs}],deliveryId:del.id,total:13975+Number(del.price)},true)&&all
all=await run('TAMPERED delivery (claims free delivery)',{items:[{productId:bc.id,name:bc.name,price:13975,specs:bcSpecs}],deliveryId:del.id,total:13975},false)&&all
all=await run('unknown option name is rejected',{items:[{productId:bc.id,name:bc.name,price:13975,specs:{...bcSpecs,Lamination:'Gold Leaf'}}],total:13975},false)&&all
all=await run('inactive/nonexistent product is rejected',{items:[{productId:'00000000-0000-0000-0000-000000000000',name:'x',price:1,specs:{Quantity:'1'}}],total:1},false)&&all
console.log(all?'\nALL VALIDATION CHECKS PASSED':'\nSOME CHECKS FAILED')
