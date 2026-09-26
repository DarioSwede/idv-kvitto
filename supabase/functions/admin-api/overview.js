const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAdminOverview(client){
  const [loginResult,submissionsResult]=await Promise.all([
    client.from('receipt_admin_audit').select('created_at,user_id,actor_email').eq('event_type','login').eq('success',true).order('created_at',{ascending:false}).limit(1),
    client.from('receipt_submissions').select('id,created_at,sender_email,status,is_test,archived_at').order('created_at',{ascending:false}).limit(5)
  ]);
  if(loginResult.error||submissionsResult.error)throw new Error('Adminöversikten kunde inte hämtas.');
  const latest=loginResult.data?.[0]||null;
  let loginEmail=latest?.actor_email||null;
  if(!loginEmail&&UUID.test(latest?.user_id||'')){
    const {data,error}=await client.auth.admin.getUserById(latest.user_id);
    if(!error)loginEmail=data?.user?.email||null;
  }
  return {
    latest_login:latest?{created_at:latest.created_at,email:loginEmail}:null,
    recent_submissions:(submissionsResult.data||[]).map(row=>({
      id:row.id,created_at:row.created_at,email:row.sender_email||null,status:row.archived_at?'archived':row.status,is_test:Boolean(row.is_test)
    }))
  };
}
