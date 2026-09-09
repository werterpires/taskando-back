import { authenticateMcp } from "../../db/mcp-auth";
import { sameOrigin, readBearerToken } from "../../db/mcp-token-crypto";
import { withPersonalContext } from "../../db/current-user";
import { takeRateLimit } from "../../db/rate-limit";
import { handleRpc } from "../../mcp/protocol";
import { mcpTools, mcpResources, callMcpTool } from "../../mcp/server";
import { taskandoGuide } from "../../mcp/guide";
export async function POST(request:Request) {
 if(!sameOrigin(request))return Response.json({error:"Origem inválida."},{status:403});
 const reject=(code:string,error:string)=>Response.json({error,code},{status:401,headers:{"WWW-Authenticate":'Bearer realm="Taskando MCP"',"Cache-Control":"no-store"}});
 const authorization=request.headers.get("authorization");
 if(!authorization?.trim())return reject("MCP_AUTH_MISSING","O cabeçalho Authorization não chegou ao Taskando. Configure Authorization: Bearer SEU_TOKEN.");
 if(!readBearerToken(request))return reject("MCP_AUTH_FORMAT","Formato de Authorization inválido. Use Bearer seguido de um espaço e do token completo tsk_ (68 caracteres). Se usar TASKANDO_TOKEN, confira se a variável foi resolvida no processo que inicia o cliente.");
 const context=await authenticateMcp(request);
 if(!context)return reject("MCP_TOKEN_INVALID","O token recebido tem o formato correto, mas não corresponde a um token ativo. Use o último token gerado e reinicie o cliente se ele lê TASKANDO_TOKEN do ambiente.");
 const limit=takeRateLimit(`mcp:${context.user.id}`,120,60000);
 if(!limit.allowed)return Response.json({error:"Limite de chamadas atingido."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 return withPersonalContext(context,()=>handleRpc(request,{tools:mcpTools,resources:mcpResources,guide:taskandoGuide,call:callMcpTool}));
}
// Stateless Streamable HTTP: server-initiated SSE and session deletion are not needed.
export async function GET(){return new Response(null,{status:405,headers:{Allow:"POST","Cache-Control":"no-store"}});}
export async function DELETE(){return new Response(null,{status:405,headers:{Allow:"POST","Cache-Control":"no-store"}});}
