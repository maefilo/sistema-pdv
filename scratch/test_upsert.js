// Using global fetch (Node 18+)
const API_URL = 'http://localhost:3001/api';

async function testUpsert() {
  const testData = {
    key: 'singleton',
    name: 'Nome de Teste Atualizado ' + new Date().toLocaleTimeString(),
    logo: 'data:image/png;base64,' + 'A'.repeat(100) // Small test
  };

  console.log('Testing upsert to company_info...');
  try {
    const res = await fetch(`${API_URL}/company_info/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    const result = await res.json();
    if (res.ok) {
      console.log('✅ Upsert successful');
      
      // Verify in DB
      const result2 = await fetch(`${API_URL}/company_info`);
      const rows = await result2.json();
      const row = rows.find(r => r.key === 'singleton');
      console.log('Verification in DB:', row?.name === testData.name ? 'SUCCESS ✅' : 'FAILED ❌');
    } else {
      console.error('❌ Upsert failed:', result);
    }
  } catch (err) {
    console.error('❌ Network/Server error:', err.message);
    console.log('Is the server running? npm start');
  }
}

testUpsert();
