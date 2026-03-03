export const onRequest: PagesFunction = async (context) => {
  return new Response(
    JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      workers: true 
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
