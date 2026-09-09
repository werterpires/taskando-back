import { operations } from "./operations";
import { operationCatalog } from "./catalog";
import { taskandoGuide, guideUri } from "./guide";
import { allowed, getItem, searchItems, nextTasks, itemTypes, taskReadiness } from "./query";
import { ensurePersonalContext } from "../db/current-user";
import { tasks } from "../db/schema";
import { eq } from "drizzle-orm";
import * as personalTasks from "../app/api/tasks/route";
import * as containerTasks from "../app/api/task-containers/[parentType]/[parentId]/route";
import * as subtasks from "../app/api/tasks/[id]/subtasks/route";
import type { Handler } from "./operations";
const string = { type: "string" };
const object = { type: "object", additionalProperties: true };
const schema = (properties: Record<string,unknown>, required: string[] = []) => ({ type:"object",properties,required,additionalProperties:false });
const workFields = { title:string,description:string,dueDate:{type:["string","null"],description:"YYYY-MM-DD"},status:{enum:["planned","todo","in_progress","awaiting_approval","completed","cancelled","archived"]},approvalRequired:{type:"boolean"},size:{enum:["xs","s","m","l","xl",null]},importance:{enum:["low","medium","high",null]},urgency:{enum:["low","medium","high",null]},taskType:{enum:["simple","recurring","commitment","scheduled","date","event","cyclic","reminder","periodic"]},startAt:string,endAt:string,dateAt:string,durationMinutes:{type:"integer"},relevance:{type:"integer"},parentType:string,parentId:string,parentTaskId:string,assigneeIds:{type:"array",items:string},recurrenceDefinition:object,tags:{type:"array",items:string} };
export const mcpTools = [
 {name:"taskando_guide",description:"Leia primeiro. Guia completo do Taskando: recursos, hierarquia, operações, limitações e fluxo de planejamento/execução.",inputSchema:schema({})},
 {name:"taskando_describe_operation",description:"Sem operation lista o catálogo. Com operation (ex.: POST /api/processes) explica parâmetros/corpo antes de executar.",inputSchema:schema({operation:string})},
 {name:"taskando_get",description:"Obtém item por tipo/ID, descrição completa e pai. Inclui tarefas e subtarefas.",inputSchema:schema({type:{enum:itemTypes},id:string},["type","id"])},
 {name:"taskando_search",description:"Busca itens acessíveis por tipo e título/nome, com paginação; inclua subtarefas usando type=task. Siga nextCursor até null.",inputSchema:schema({type:{enum:itemTypes},query:string,cursor:string,limit:{type:"integer",minimum:1,maximum:100}},["type"])},
 {name:"taskando_next_tasks",description:"Próximas tarefas executáveis, bloqueadas e prazos do projeto inteiro, incluindo descendentes/subtarefas. Leia todas as páginas. readyOnly padrão true; dueBefore inclusivo; today padrão UTC.",inputSchema:schema({projectId:string,readyOnly:{type:"boolean"},dueBefore:string,today:string,cursor:string})},
 {name:"taskando_create_task",description:"Cria tarefa no pai indicado ou subtarefa em parentTaskId; sem pai cria no espaço pessoal. Leia o guia para regras dos tipos.",inputSchema:schema(workFields,["title"])},
 {name:"taskando_update_task",description:"Edita tarefa/subtarefa, documenta ou muda status; respeita dependências, aprovações e decisões de cancelamento.",inputSchema:schema({id:string,body:object},["id","body"])},
 {name:"taskando_request",description:"Executa uma operação do catálogo interno. Consulte taskando_describe_operation primeiro. Inclui CRUD de fases/processos/produtos/projetos e recursos auxiliares. Não aceita URLs livres nem identidade do usuário.",inputSchema:schema({operation:{type:"string",enum:operations.map(o=>o.operation)},params:object,query:object,body:object},["operation"])},
].map(t=>({...t,annotations:{readOnlyHint:!["taskando_create_task","taskando_update_task","taskando_request"].includes(t.name),destructiveHint:["taskando_update_task","taskando_request"].includes(t.name),openWorldHint:false}}));
export async function invokeOperation(operation:string, params:Record<string,string>={},query:Record<string,unknown>={},body:Record<string,unknown>={}) {
 const op=operations.find(o=>o.operation===operation); if(!op) throw new Error("Operação não disponível. Consulte o catálogo.");
 for(const key of op.params) if(typeof params[key]!=="string"||!params[key]||params[key].length>200) throw new Error(`Parâmetro obrigatório: ${key}`);
 // Verify primary resource independently before invoking legacy handlers.
 const match=/^\/api\/(tasks|projects|products|processes|phases|fronts|organizations)\/\[id\]/.exec(op.path);
 const types:Record<string,typeof itemTypes[number]>={tasks:"task",projects:"project",products:"product",processes:"process",phases:"phase",fronts:"front",organizations:"organization"};
 if(match && !await allowed(types[match[1]],params.id)) throw new Error("Item não encontrado ou sem acesso.");
 if(op.path==="/api/tasks/[id]" && op.method==="PATCH" && body.dueDate) {
  const c=(await ensurePersonalContext())!;const [task]=await c.db.select().from(tasks).where(eq(tasks.id,params.id));
  if(task.parentTaskId){const [parent]=await c.db.select().from(tasks).where(eq(tasks.id,task.parentTaskId));if(parent?.dueDate && String(body.dueDate)>parent.dueDate)return {status:400,error:"O prazo da subtarefa não pode ultrapassar o prazo da mãe."};}
 }
 if(op.path==="/api/tasks/[id]" && op.method==="PATCH" && (body.approve===true||["in_progress","completed","awaiting_approval"].includes(String(body.status)))) {
  const c=(await ensurePersonalContext())!; const [task]=await c.db.select().from(tasks).where(eq(tasks.id,params.id));
  const state=await taskReadiness(task); if(state.blockers.length) return {status:409,error:"Tarefa bloqueada.",blockers:state.blockers};
 }
 let path=op.path; for(const key of op.params) path=path.replace(`[${key}]`,encodeURIComponent(params[key]));
 const url=new URL(path,"https://taskando.internal");
 for(const [key,value] of Object.entries(query)) if(value!==undefined&&value!==null) url.searchParams.set(key,String(value));
 const req=new Request(url,{method:op.method,headers:{"content-type":"application/json"},...(op.method!=="GET"?{body:JSON.stringify(body)}:{})});
 const response=await op.handler(req,{params:Promise.resolve(params)});
 return {status:response.status,...await response.json()};
}
export async function callMcpTool(name:string,args:Record<string,unknown>) {
 if(name==="taskando_guide") return {guide:taskandoGuide};
 if(name==="taskando_describe_operation") {
  if(!args.operation) return {operations:operations.map(o=>o.operation),instructions:"Consulte uma operation antes de executá-la; leia taskando_guide para os fluxos completos."};
  const op=operations.find(o=>o.operation===args.operation); if(!op) throw new Error("Operação não disponível.");
  const reference=operationCatalog.find(c=>c.route===op.path);
  return {...reference,operation:op.operation,usage:{operation:op.operation,params:Object.fromEntries(op.params.map(k=>[k,`ID de ${k}`])),query:{},body:{}},commonWorkFields:workFields,notes:"Envie apenas campos aceitos pela referência do corpo. GET usa query; mutações usam body. Não envie userId/personalSpaceId. Os erros do domínio preservam decisões necessárias."};
 }
 if(name==="taskando_get") return getItem(args.type as typeof itemTypes[number],String(args.id));
 if(name==="taskando_search") return searchItems(args);
 if(name==="taskando_next_tasks") return nextTasks(args);
 if(name==="taskando_update_task") return invokeOperation("PATCH /api/tasks/[id]",{id:String(args.id)},{},args.body as Record<string,unknown>);
 if(name==="taskando_create_task") {
  const {parentTaskId,parentType,parentId,...body}=args;
  if(parentTaskId && (parentType||parentId)) throw new Error("Informe parentTaskId OU parentType/parentId.");
  if(Boolean(parentType)!==Boolean(parentId)) throw new Error("Informe parentType e parentId juntos.");
  const handler:Handler=parentTaskId?subtasks.POST as Handler:parentType?containerTasks.POST as Handler:personalTasks.POST;
  const request=new Request("https://taskando.internal/api/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const params:Record<string,string>={}; if(parentTaskId)params.id=String(parentTaskId); else if(parentType){params.parentType=String(parentType);params.parentId=String(parentId);}
  const response=await handler(request,{params:Promise.resolve(params)});
  return {status:response.status,...await response.json()};
 }
 if(name==="taskando_request") return invokeOperation(String(args.operation),args.params as Record<string,string>,args.query as Record<string,unknown>,args.body as Record<string,unknown>);
 throw new Error("Ferramenta não encontrada.");
}
export const mcpResources=[{uri:guideUri,name:"guia-taskando",title:"Guia completo do Taskando para IAs",description:"Capacidades, hierarquia, regras, catálogo e fluxo de planos até execução.",mimeType:"text/markdown"}];
