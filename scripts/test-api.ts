async function testAPI() {
  try {
    // Get auth token (you'll need to be signed in)
    const response = await fetch("http://localhost:3000/api/opportunities?pageSize=3");
    const data = await response.json();
    
    console.log("\n=== API Response Sample ===");
    console.log("Total editions:", data.total);
    console.log("\nFirst 3 editions:");
    
    data.editions?.slice(0, 3).forEach((edition: any, index: number) => {
      console.log(`\n[${index + 1}] Edition ID: ${edition.id}`);
      console.log(`    Status: ${edition.status}`);
      console.log(`    Opportunity:`, edition.opportunity ? {
        id: edition.opportunity.id,
        slug: edition.opportunity.slug,
        name: edition.opportunity.name,
      } : "MISSING!");
    });
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testAPI();

