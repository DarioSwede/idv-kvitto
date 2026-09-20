import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {requireStaff,serviceClient,publicAuthClient} from './auth.ts';
import {createAdminHandler} from './handler.ts';
Deno.serve(createAdminHandler({requireStaff,serviceClient,publicAuthClient,getEnv:name=>Deno.env.get(name)}));
