import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import XLSX from "xlsx";
const SOURCE_URL="https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx";
const SOURCE_VERSION="MEXT_JFCS_8th_2023_supplement_2023_errata_2026-03-27";
const OUT=path.resolve("data/mext/food-master.json");
function get(url){return new Promise((resolve,reject)=>https.get(url,res=>{if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();return get(new URL(res.headers.location,url).toString()).then(resolve,reject)}if(res.statusCode!==200){res.resume();return reject(new Error("HTTP "+res.statusCode))}const a=[];res.on("data",x=>a.push(x));res.on("end",()=>resolve(Buffer.concat(a)))}).on("error",reject))}
function n(v){if(v===null||v===undefined||v==="")return{value:null,status:"missing"};if(v==="-")return{value:null,status:"not_measured"};if(v==="Tr")return{value:null,status:"trace"};if(v==="(Tr)")return{value:null,status:"estimated_trace"};if(v==="(0)")return{value:0,status:"estimated_zero"};if(typeof v==="number")return{value:v,status:"measured"};const s=String(v),e=Number(s);if(Number.isFinite(e))return{value:e,status:"measured"};const m=s.match(/^\(([-+]?\d*\.?\d+)\)$/);if(m)return{value:Number(m[1]),status:"estimated"};return{value:s,status:"text"}}
const wb=XLSX.read(await get(SOURCE_URL),{type:"buffer"}),sheet=wb.Sheets["表全体"];if(!sheet)throw new Error("MEXT sheet 表全体 not found");
const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null}),foods=[];
for(let i=12;i<rows.length;i++){const r=rows[i];if(!r||!r[1])continue;const e=n(r[6]),p=n(r[9]),f=n(r[12]),c=n(r[20]);foods.push({foodId:String(r[1]),source:"MEXT",sourceVersion:SOURCE_VERSION,sourceFoodId:String(r[1]),name:String(r[3]),sourceName:String(r[3]),sourceFoodGroup:String(r[0]),state:"as_listed",edibleBasis:"edible portion per 100g",wasteRatePercent:n(r[4]),basisAmount:100,basisUnit:"g",energyKcal:e,proteinG:p,fatG:f,carbohydrateG:c,nutritionStatus:[e,p,f,c].every(x=>!["missing","not_measured","text"].includes(x.status))?"known":"partial",nutrientStatuses:{energyKcal:e.status,proteinG:p.status,fatG:f.status,carbohydrateG:c.status},dataVersion:"2026-03-27"})}
const ids=new Set(foods.map(x=>x.foodId));if(foods.length!==2538||ids.size!==2538)throw new Error("Expected 2538 unique foods; got "+foods.length+"/"+ids.size);
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({schemaVersion:"1.0.0",generatedFrom:"MEXT official Chapter 2 workbook",sourceUrl:SOURCE_URL,sourceVersion:SOURCE_VERSION,foodCount:foods.length,foods}));
console.log("OK",foods.length);