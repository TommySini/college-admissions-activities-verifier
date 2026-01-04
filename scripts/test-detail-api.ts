async function testDetailAPI() {
  const testSlugs = [
    'envirothon',
    'usaco-december-2025',
    'national-economics-challenge-2026',
    'usa-computing-olympiad-usaco', // From earlier DB check
  ];

  for (const slug of testSlugs) {
    try {
      const response = await fetch(`http://localhost:3000/api/opportunities/${slug}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ "${slug}" → Found: ${data.opportunity?.name}`);
      } else {
        console.log(`❌ "${slug}" → ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.log(`❌ "${slug}" → Error: ${error.message}`);
    }
  }
}

testDetailAPI();
