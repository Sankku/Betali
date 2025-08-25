const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMissingUserOrganizations() {
  console.log('🔧 Fixing missing user_organizations relationships...');
  
  try {
    // 1. Get all organizations with their owners
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('organization_id, name, owner_user_id')
      .not('owner_user_id', 'is', null);
    
    if (orgsError) {
      throw orgsError;
    }
    
    console.log(`Found ${orgs.length} organizations with owners`);
    
    // 2. Get existing user_organizations relationships
    const { data: existingRelations, error: relationsError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id');
    
    if (relationsError) {
      throw relationsError;
    }
    
    console.log(`Found ${existingRelations.length} existing user_organizations relationships`);
    
    // 3. Find missing relationships
    const missingRelations = [];
    
    for (const org of orgs) {
      const hasRelation = existingRelations.some(rel => 
        rel.user_id === org.owner_user_id && rel.organization_id === org.organization_id
      );
      
      if (!hasRelation) {
        missingRelations.push(org);
      }
    }
    
    console.log(`Found ${missingRelations.length} missing relationships:`, 
      missingRelations.map(org => org.name));
    
    // 4. Create missing relationships
    for (const org of missingRelations) {
      console.log(`🔨 Creating relationship for: ${org.name}`);
      
      const { error: insertError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: org.owner_user_id,
          organization_id: org.organization_id,
          role: 'super_admin',
          permissions: ['*'],
          is_active: true,
          joined_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Error creating relationship for ${org.name}:`, insertError);
      } else {
        console.log(`✅ Created relationship for: ${org.name}`);
      }
    }
    
    console.log('\n🎉 All missing user_organizations relationships have been created!');
    
    // 5. Show final status
    const { data: finalRelations, error: finalError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        organization_id,
        role,
        organizations(name)
      `);
    
    if (!finalError) {
      console.log('\n📊 Final user_organizations status:');
      finalRelations.forEach(rel => {
        console.log(`  - ${rel.organizations.name}: User ${rel.user_id} as ${rel.role}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Error fixing missing user_organizations:', error);
  }
}

// Run the fix
fixMissingUserOrganizations();